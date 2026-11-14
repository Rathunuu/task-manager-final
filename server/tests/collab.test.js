import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GEMINI_API_KEY = "test-key";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/user.js");
const { default: Task } = await import("../models/Task.js");
const { default: Comment } = await import("../models/Comment.js");
const { default: Notification } = await import("../models/Notification.js");

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

async function signupAndLogin(name, email, password = "secret123") {
    await request(app)
        .post("/api/auth/signup")
        .send({ name, email, password });

    const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

    return { token: res.body.token, user: res.body.user, email };
}

function auth(token) {
    return { Authorization: `Bearer ${token}` };
}

async function createProject(token, name = "Collab Project") {
    const res = await request(app)
        .post("/api/projects")
        .set(auth(token))
        .send({ name });

    return res.body.project;
}

async function addMember(ownerToken, projectId, email) {
    return request(app)
        .post(`/api/projects/${projectId}/members`)
        .set(auth(ownerToken))
        .send({ email });
}

async function createTask(token, projectId, extra = {}) {
    const res = await request(app)
        .post("/api/tasks")
        .set(auth(token))
        .send({ title: "Shared task", project: projectId, ...extra });

    return res.body.task;
}

async function notificationsOf(user) {
    return Notification.find({ user: user.user.id });
}

describe("Comments", () => {
    test("a member can post a comment and read the thread in order", async () => {
        const owner = await signupAndLogin("Owner C1", "ownerc1@example.com");
        const member = await signupAndLogin("Member C1", "memberc1@example.com");

        const project = await createProject(owner.token);
        await addMember(owner.token, project._id, member.email);
        const task = await createTask(owner.token, project._id);

        const first = await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(owner.token))
            .send({ text: "First comment" });
        expect(first.status).toBe(201);
        expect(first.body.comment.author.name).toBe("Owner C1");

        await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(member.token))
            .send({ text: "Second comment" });

        const thread = await request(app)
            .get(`/api/tasks/${task._id}/comments`)
            .set(auth(member.token));

        expect(thread.status).toBe(200);
        expect(thread.body.map((c) => c.text)).toEqual([
            "First comment",
            "Second comment"
        ]);
    });

    test("a non-member cannot read or post comments", async () => {
        const owner = await signupAndLogin("Owner C2", "ownerc2@example.com");
        const outsider = await signupAndLogin("Outsider C2", "outsiderc2@example.com");

        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(owner.token))
            .send({ text: "Private discussion" });

        const read = await request(app)
            .get(`/api/tasks/${task._id}/comments`)
            .set(auth(outsider.token));
        expect(read.status).toBe(404);
        expect(JSON.stringify(read.body)).not.toContain("Private discussion");

        const post = await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(outsider.token))
            .send({ text: "Sneaky comment" });
        expect(post.status).toBe(404);

        expect(await Comment.countDocuments({ task: task._id })).toBe(1);
    });

    test("empty comments and bad task ids are rejected", async () => {
        const owner = await signupAndLogin("Owner C3", "ownerc3@example.com");

        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const empty = await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(owner.token))
            .send({ text: "   " });
        expect(empty.status).toBe(400);

        const badId = await request(app)
            .get("/api/tasks/not-a-real-id/comments")
            .set(auth(owner.token));
        expect(badId.status).toBe(404);
    });

    test("comments need a login", async () => {
        const res = await request(app).get(
            `/api/tasks/${new mongoose.Types.ObjectId()}/comments`
        );
        expect(res.status).toBe(401);
    });
});

describe("Notifications", () => {
    test("a comment notifies the task's creator and assignee, never the author", async () => {
        const creator = await signupAndLogin("Creator N1", "creatorn1@example.com");
        const assignee = await signupAndLogin("Assignee N1", "assigneen1@example.com");
        const bystander = await signupAndLogin("Bystander N1", "bystandern1@example.com");

        const project = await createProject(creator.token);
        await addMember(creator.token, project._id, assignee.email);
        await addMember(creator.token, project._id, bystander.email);

        const task = await createTask(creator.token, project._id, {
            assignedTo: assignee.user.id
        });

        await Notification.deleteMany({});

        await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set(auth(assignee.token))
            .send({ text: "Working on it" });

        const forCreator = await notificationsOf(creator);
        expect(forCreator).toHaveLength(1);
        expect(forCreator[0].type).toBe("comment");
        expect(forCreator[0].message).toMatch(/Assignee N1 commented/);

        // The author and the bystander get nothing
        expect(await notificationsOf(assignee)).toHaveLength(0);
        expect(await notificationsOf(bystander)).toHaveLength(0);
    });

    test("assigning a task notifies the assignee; assigning to yourself does not", async () => {
        const owner = await signupAndLogin("Owner N2", "ownern2@example.com");
        const member = await signupAndLogin("Member N2", "membern2@example.com");

        const project = await createProject(owner.token);
        await addMember(owner.token, project._id, member.email);
        await Notification.deleteMany({});

        await createTask(owner.token, project._id, {
            assignedTo: member.user.id
        });

        const forMember = await notificationsOf(member);
        expect(forMember).toHaveLength(1);
        expect(forMember[0].type).toBe("assignment");

        await createTask(owner.token, project._id, {
            title: "Mine",
            assignedTo: owner.user.id
        });
        expect(await notificationsOf(owner)).toHaveLength(0);
    });

    test("re-assigning notifies only the new assignee, saving without a change does not", async () => {
        const owner = await signupAndLogin("Owner N3", "ownern3@example.com");
        const one = await signupAndLogin("One N3", "onen3@example.com");
        const two = await signupAndLogin("Two N3", "twon3@example.com");

        const project = await createProject(owner.token);
        await addMember(owner.token, project._id, one.email);
        await addMember(owner.token, project._id, two.email);

        const task = await createTask(owner.token, project._id, {
            assignedTo: one.user.id
        });
        await Notification.deleteMany({});

        const body = (assignedTo) => ({
            title: task.title,
            project: String(task.project),
            status: task.status,
            assignedTo
        });

        // Same assignee again: nobody is told
        await request(app)
            .put(`/api/tasks/${task._id}`)
            .set(auth(owner.token))
            .send(body(one.user.id));
        expect(await Notification.countDocuments()).toBe(0);

        // New assignee: only that person is told
        await request(app)
            .put(`/api/tasks/${task._id}`)
            .set(auth(owner.token))
            .send(body(two.user.id));

        expect(await notificationsOf(two)).toHaveLength(1);
        expect(await notificationsOf(one)).toHaveLength(0);
    });

    test("being added to a project notifies exactly the person added", async () => {
        const owner = await signupAndLogin("Owner N4", "ownern4@example.com");
        const added = await signupAndLogin("Added N4", "addedn4@example.com");
        const other = await signupAndLogin("Other N4", "othern4@example.com");

        const project = await createProject(owner.token, "Welcome Project");
        await Notification.deleteMany({});

        const res = await addMember(owner.token, project._id, added.email);
        expect(res.status).toBe(201);

        const forAdded = await notificationsOf(added);
        expect(forAdded).toHaveLength(1);
        expect(forAdded[0].type).toBe("added_to_project");
        expect(forAdded[0].message).toMatch(/Welcome Project/);
        expect(String(forAdded[0].project)).toBe(String(project._id));

        expect(await notificationsOf(owner)).toHaveLength(0);
        expect(await notificationsOf(other)).toHaveLength(0);
    });

    test("admin assign notifies new members and assignees", async () => {
        const owner = await signupAndLogin("Owner N5", "ownern5@example.com");
        const admin = await signupAndLogin("Admin N5", "adminn5@example.com");
        const worker = await signupAndLogin("Worker N5", "workern5@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const project = await createProject(owner.token);
        await Notification.deleteMany({});

        await request(app)
            .post("/api/tasks/admin/assign")
            .set(auth(admin.token))
            .send({
                title: "Admin task",
                project: project._id,
                assignedTo: [worker.user.id]
            });

        const types = (await notificationsOf(worker)).map((n) => n.type).sort();
        expect(types).toEqual(["added_to_project", "assignment"]);
        expect(await notificationsOf(admin)).toHaveLength(0);
        expect(await notificationsOf(owner)).toHaveLength(0);
    });

    test("the bell shows only my notifications with an unread count, and I can mark them read", async () => {
        const owner = await signupAndLogin("Owner N6", "ownern6@example.com");
        const member = await signupAndLogin("Member N6", "membern6@example.com");

        const project = await createProject(owner.token);
        await addMember(owner.token, project._id, member.email);
        await createTask(owner.token, project._id, { assignedTo: member.user.id });
        await Notification.updateMany({ user: owner.user.id }, { read: true });

        const list = await request(app)
            .get("/api/notifications")
            .set(auth(member.token));

        expect(list.status).toBe(200);
        expect(list.body.unreadCount).toBe(2);
        expect(list.body.notifications).toHaveLength(2);
        list.body.notifications.forEach((n) =>
            expect(String(n.user)).toBe(member.user.id)
        );

        // Mark one as read
        const one = await request(app)
            .patch(`/api/notifications/${list.body.notifications[0]._id}/read`)
            .set(auth(member.token));
        expect(one.status).toBe(200);

        const afterOne = await request(app)
            .get("/api/notifications")
            .set(auth(member.token));
        expect(afterOne.body.unreadCount).toBe(1);

        // Mark all as read
        await request(app)
            .patch("/api/notifications/read-all")
            .set(auth(member.token));

        const afterAll = await request(app)
            .get("/api/notifications")
            .set(auth(member.token));
        expect(afterAll.body.unreadCount).toBe(0);
    });

    test("nobody can mark someone else's notification as read", async () => {
        const owner = await signupAndLogin("Owner N7", "ownern7@example.com");
        const member = await signupAndLogin("Member N7", "membern7@example.com");

        const project = await createProject(owner.token);
        await addMember(owner.token, project._id, member.email);

        const [theirs] = await notificationsOf(member);

        const res = await request(app)
            .patch(`/api/notifications/${theirs._id}/read`)
            .set(auth(owner.token));
        expect(res.status).toBe(404);

        expect((await Notification.findById(theirs._id)).read).toBe(false);
    });

    test("notifications need a login", async () => {
        const res = await request(app).get("/api/notifications");
        expect(res.status).toBe(401);
    });
});
