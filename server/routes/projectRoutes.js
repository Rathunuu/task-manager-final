import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GEMINI_API_KEY = "test-key";

const { default: app } = await import("../app.js");
const { default: User } = await import("../models/user.js");
const { default: Project } = await import("../models/project.js");
const { default: Task } = await import("../models/Task.js");

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

async function createProject(token, name = "Team Project") {
    const res = await request(app)
        .post("/api/projects")
        .set(auth(token))
        .send({ name });

    return res.body.project;
}

async function createTask(token, projectId, title = "Shared task") {
    const res = await request(app)
        .post("/api/tasks")
        .set(auth(token))
        .send({ title, project: projectId });

    return res.body.task;
}

function taskBody(task, changes = {}) {
    return {
        title: task.title,
        project: String(task.project),
        status: task.status,
        ...changes
    };
}

describe("Project creation", () => {
    test("the creator becomes the project's first owner", async () => {
        const owner = await signupAndLogin("Creator", "creator@example.com");

        const project = await createProject(owner.token);

        expect(project.members).toHaveLength(1);
        expect(String(project.members[0].user)).toBe(owner.user.id);
        expect(project.members[0].role).toBe("owner");
    });

    test("a project can never be saved without an owner", async () => {
        await expect(
            Project.create({ name: "No owner", members: [] })
        ).rejects.toThrow(/at least one owner/i);
    });
});

describe("A non-member is blocked", () => {
    test("cannot see, create, update or delete tasks in someone else's project", async () => {
        const owner = await signupAndLogin("Owner A", "ownera@example.com");
        const outsider = await signupAndLogin("Outsider A", "outsidera@example.com");

        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        // does not appear in their list of tasks or projects
        const tasks = await request(app).get("/api/tasks").set(auth(outsider.token));
        expect(tasks.body.map((t) => t._id)).not.toContain(task._id);

        const projects = await request(app).get("/api/projects").set(auth(outsider.token));
        expect(projects.body.map((p) => p._id)).not.toContain(project._id);

        // cannot create a task in it
        const create = await request(app)
            .post("/api/tasks")
            .set(auth(outsider.token))
            .send({ title: "Sneaky", project: project._id });
        expect(create.status).toBe(404);

        // cannot update it
        const update = await request(app)
            .put(`/api/tasks/${task._id}`)
            .set(auth(outsider.token))
            .send(taskBody(task, { title: "Hacked" }));
        expect(update.status).toBe(404);

        // cannot delete it
        const del = await request(app)
            .delete(`/api/tasks/${task._id}`)
            .set(auth(outsider.token));
        expect(del.status).toBe(404);

        const stillThere = await Task.findById(task._id);
        expect(stillThere.title).toBe("Shared task");
    });

    test("cannot list or change the members of a project", async () => {
        const owner = await signupAndLogin("Owner B", "ownerb@example.com");
        const outsider = await signupAndLogin("Outsider B", "outsiderb@example.com");

        const project = await createProject(owner.token);

        const list = await request(app)
            .get(`/api/projects/${project._id}/members`)
            .set(auth(outsider.token));
        expect(list.status).toBe(404);

        const add = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(outsider.token))
            .send({ email: outsider.email });
        expect(add.status).toBe(404);
    });
});

describe("A member (not just an owner) can work with the project", () => {
    test("sees the shared project and its tasks, and can update a task", async () => {
        const owner = await signupAndLogin("Owner C", "ownerc@example.com");
        const member = await signupAndLogin("Member C", "memberc@example.com");

        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const add = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });
        expect(add.status).toBe(201);

        // the project now shows up for the member, even though they did not create it
        const projects = await request(app).get("/api/projects").set(auth(member.token));
        expect(projects.body.map((p) => p._id)).toContain(project._id);

        // and so does its task
        const tasks = await request(app).get("/api/tasks").set(auth(member.token));
        expect(tasks.body.map((t) => t._id)).toContain(task._id);

        // the member can update it
        const update = await request(app)
            .put(`/api/tasks/${task._id}`)
            .set(auth(member.token))
            .send(taskBody(task, { status: "in-progress" }));
        expect(update.status).toBe(200);
        expect(update.body.task.status).toBe("in-progress");

        // the member can create a task in it too
        const created = await request(app)
            .post("/api/tasks")
            .set(auth(member.token))
            .send({ title: "Added by member", project: project._id });
        expect(created.status).toBe(201);
    });

    test("but a member cannot edit or delete the project, or manage members", async () => {
        const owner = await signupAndLogin("Owner D", "ownerd@example.com");
        const member = await signupAndLogin("Member D", "memberd@example.com");
        const other = await signupAndLogin("Other D", "otherd@example.com");

        const project = await createProject(owner.token);

        await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });

        const edit = await request(app)
            .put(`/api/projects/${project._id}`)
            .set(auth(member.token))
            .send({ name: "Renamed by member" });
        expect(edit.status).toBe(403);

        const del = await request(app)
            .delete(`/api/projects/${project._id}`)
            .set(auth(member.token));
        expect(del.status).toBe(403);

        const add = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(member.token))
            .send({ email: other.email });
        expect(add.status).toBe(403);

        const remove = await request(app)
            .delete(`/api/projects/${project._id}/members/${owner.user.id}`)
            .set(auth(member.token));
        expect(remove.status).toBe(403);

        const unchanged = await Project.findById(project._id);
        expect(unchanged.name).toBe("Team Project");
        expect(unchanged.members).toHaveLength(2);
    });
});

describe("Only an owner can add or remove members", () => {
    test("owner adds a member, lists members, then removes them", async () => {
        const owner = await signupAndLogin("Owner E", "ownere@example.com");
        const member = await signupAndLogin("Member E", "membere@example.com");

        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const add = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });
        expect(add.status).toBe(201);

        const list = await request(app)
            .get(`/api/projects/${project._id}/members`)
            .set(auth(owner.token));
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(2);

        const roles = Object.fromEntries(
            list.body.map((m) => [m.user.email, m.role])
        );
        expect(roles["ownere@example.com"]).toBe("owner");
        expect(roles["membere@example.com"]).toBe("member");

        const remove = await request(app)
            .delete(`/api/projects/${project._id}/members/${member.user.id}`)
            .set(auth(owner.token));
        expect(remove.status).toBe(200);

        // the project and its tasks disappear for the removed member
        const projects = await request(app).get("/api/projects").set(auth(member.token));
        expect(projects.body.map((p) => p._id)).not.toContain(project._id);

        const tasks = await request(app).get("/api/tasks").set(auth(member.token));
        expect(tasks.body.map((t) => t._id)).not.toContain(task._id);
    });

    test("adding someone twice, or someone who does not exist, is rejected", async () => {
        const owner = await signupAndLogin("Owner F", "ownerf@example.com");
        const member = await signupAndLogin("Member F", "memberf@example.com");

        const project = await createProject(owner.token);

        await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });

        const twice = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });
        expect(twice.status).toBe(409);

        const missing = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: "nobody@example.com" });
        expect(missing.status).toBe(404);
    });

    test("the only owner cannot be removed", async () => {
        const owner = await signupAndLogin("Owner G", "ownerg@example.com");

        const project = await createProject(owner.token);

        const remove = await request(app)
            .delete(`/api/projects/${project._id}/members/${owner.user.id}`)
            .set(auth(owner.token));
        expect(remove.status).toBe(400);

        const unchanged = await Project.findById(project._id);
        expect(unchanged.members).toHaveLength(1);
    });

    test("a global admin can manage members of a project they are not in", async () => {
        const owner = await signupAndLogin("Owner H", "ownerh@example.com");
        const member = await signupAndLogin("Member H", "memberh@example.com");
        const admin = await signupAndLogin("Admin H", "adminh@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const project = await createProject(owner.token);

        const add = await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(admin.token))
            .send({ email: member.email });
        expect(add.status).toBe(201);
    });
});

describe("POST /api/tasks/admin/assign uses a real shared project", () => {
    test("adds the assignees to the chosen project instead of creating duplicates", async () => {
        const owner = await signupAndLogin("Owner I", "owneri@example.com");
        const userOne = await signupAndLogin("User One", "one@example.com");
        const userTwo = await signupAndLogin("User Two", "two@example.com");
        const admin = await signupAndLogin("Admin I", "admini@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const project = await createProject(owner.token, "Real Shared Project");
        const projectsBefore = await Project.countDocuments();

        const res = await request(app)
            .post("/api/tasks/admin/assign")
            .set(auth(admin.token))
            .send({
                title: "Prepare the report",
                project: project._id,
                assignedTo: [userOne.user.id, userTwo.user.id]
            });

        expect(res.status).toBe(201);
        expect(res.body.tasks).toHaveLength(2);
        expect(res.body.membersAdded).toBe(2);

        // no new project was created, and no "Assigned by Admin" project exists
        expect(await Project.countDocuments()).toBe(projectsBefore);
        expect(await Project.countDocuments({ name: "Assigned by Admin" })).toBe(0);

        // both tasks live in the real project
        for (const task of res.body.tasks) {
            expect(String(task.project)).toBe(project._id);
        }

        // both users are now members of that one project
        const saved = await Project.findById(project._id);
        expect(saved.isMember(userOne.user.id)).toBe(true);
        expect(saved.isMember(userTwo.user.id)).toBe(true);

        // and the project shows up in each of their lists
        for (const user of [userOne, userTwo]) {
            const projects = await request(app).get("/api/projects").set(auth(user.token));
            expect(projects.body.map((p) => p._id)).toContain(project._id);
        }
    });

    test("assigning again does not add duplicate members", async () => {
        const owner = await signupAndLogin("Owner J", "ownerj@example.com");
        const user = await signupAndLogin("User J", "userj@example.com");
        const admin = await signupAndLogin("Admin J", "adminj@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const project = await createProject(owner.token);

        for (let i = 0; i < 2; i++) {
            const res = await request(app)
                .post("/api/tasks/admin/assign")
                .set(auth(admin.token))
                .send({
                    title: `Task ${i}`,
                    project: project._id,
                    assignedTo: [user.user.id]
                });
            expect(res.status).toBe(201);
        }

        const saved = await Project.findById(project._id);
        expect(saved.members).toHaveLength(2);
    });

    test("requires a target project and an admin", async () => {
        const normal = await signupAndLogin("Normal K", "normalk@example.com");
        const admin = await signupAndLogin("Admin K", "admink@example.com");
        const user = await signupAndLogin("User K", "userk@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const noProject = await request(app)
            .post("/api/tasks/admin/assign")
            .set(auth(admin.token))
            .send({ title: "No project", assignedTo: [user.user.id] });
        expect(noProject.status).toBe(400);

        const project = await createProject(user.token);

        const notAdmin = await request(app)
            .post("/api/tasks/admin/assign")
            .set(auth(normal.token))
            .send({
                title: "Not allowed",
                project: project._id,
                assignedTo: [user.user.id]
            });
        expect(notAdmin.status).toBe(403);
    });
});


describe("GET /api/projects/admin/all", () => {
    test("only a global admin can list every project", async () => {
        const owner = await signupAndLogin("Owner K", "ownerk@example.com");
        const admin = await signupAndLogin("Admin K", "admink@example.com");

        await User.updateOne({ _id: admin.user.id }, { role: "admin" });

        const project = await createProject(owner.token, "Not Admin's Project");

        // a normal user is refused
        const denied = await request(app)
            .get("/api/projects/admin/all")
            .set(auth(owner.token));
        expect(denied.status).toBe(403);

        // the admin sees it even though they are not a member
        const ok = await request(app)
            .get("/api/projects/admin/all")
            .set(auth(admin.token));
        expect(ok.status).toBe(200);
        expect(ok.body.map((p) => p._id)).toContain(project._id);
    });
});
