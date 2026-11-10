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
const { resetLoginAttempts } = await import("../middleware/loginLimiter.js");

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(() => {
    resetLoginAttempts();
});

async function signupAndLogin(name, email, password = "secret123") {
    await request(app)
        .post("/api/auth/signup")
        .send({ name, email, password });

    const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

    return { token: res.body.token, user: res.body.user, email, password };
}

function auth(token) {
    return { Authorization: `Bearer ${token}` };
}

async function makeAdmin(user) {
    await User.updateOne({ _id: user.user.id }, { role: "admin" });
}

async function createProject(token, name = "Lifecycle Project") {
    const res = await request(app)
        .post("/api/projects")
        .set(auth(token))
        .send({ name });

    return res.body.project;
}

async function setActive(adminToken, userId, active) {
    return request(app)
        .patch(`/api/auth/users/${userId}/active`)
        .set(auth(adminToken))
        .send({ active });
}

describe("Deactivating a user", () => {
    test("deactivated user cannot log in, old token stops working, nothing is deleted", async () => {
        const admin = await signupAndLogin("Admin L1", "adminl1@example.com");
        const owner = await signupAndLogin("Owner L1", "ownerl1@example.com");
        const worker = await signupAndLogin("Worker L1", "workerl1@example.com");

        await makeAdmin(admin);

        const project = await createProject(owner.token);

        await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: worker.email });

        const task = await Task.create({
            title: "Worker's task",
            project: project._id,
            assignedTo: worker.user.id,
            createdBy: worker.user.id
        });

        const res = await setActive(admin.token, worker.user.id, false);
        expect(res.status).toBe(200);
        expect(res.body.user.active).toBe(false);

        // Cannot log in, even with the right password
        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: worker.email, password: worker.password });
        expect(login.status).toBe(403);
        expect(login.body.message).toMatch(/deactivated/i);

        // The token they already had stops working immediately
        const withOldToken = await request(app)
            .get("/api/tasks")
            .set(auth(worker.token));
        expect(withOldToken.status).toBe(401);

        // History is untouched: the task and the membership are still there
        const stillThere = await Task.findById(task._id);
        expect(stillThere).not.toBeNull();
        expect(String(stillThere.assignedTo)).toBe(worker.user.id);

        const projectAfter = await Project.findById(project._id);
        expect(projectAfter.isMember(worker.user.id)).toBe(true);
    });

    test("reactivating lets the user log in again", async () => {
        const admin = await signupAndLogin("Admin L2", "adminl2@example.com");
        const user = await signupAndLogin("User L2", "userl2@example.com");

        await makeAdmin(admin);

        await setActive(admin.token, user.user.id, false);
        const back = await setActive(admin.token, user.user.id, true);
        expect(back.status).toBe(200);

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: user.password });
        expect(login.status).toBe(200);
        expect(login.body.token).toBeTruthy();
    });

    test("a normal user cannot deactivate anyone", async () => {
        const a = await signupAndLogin("User L3a", "userl3a@example.com");
        const b = await signupAndLogin("User L3b", "userl3b@example.com");

        const res = await setActive(a.token, b.user.id, false);

        expect(res.status).toBe(403);
        expect((await User.findById(b.user.id)).active).toBe(true);
    });

    test("active must be true or false", async () => {
        const admin = await signupAndLogin("Admin L4", "adminl4@example.com");
        const user = await signupAndLogin("User L4", "userl4@example.com");

        await makeAdmin(admin);

        const res = await request(app)
            .patch(`/api/auth/users/${user.user.id}/active`)
            .set(auth(admin.token))
            .send({ active: "no" });

        expect(res.status).toBe(400);
    });

    test("the only admin cannot be deactivated", async () => {
        // Make sure this admin really is the only one
        await User.updateMany({ role: "admin" }, { role: "user" });

        const admin = await signupAndLogin("Only Admin", "onlyadmin@example.com");
        await makeAdmin(admin);

        const res = await setActive(admin.token, admin.user.id, false);

        expect(res.status).toBe(400);
        expect((await User.findById(admin.user.id)).active).toBe(true);

        // ...and the admin can still use the system
        const stillWorks = await request(app)
            .get("/api/auth/users")
            .set(auth(admin.token));
        expect(stillWorks.status).toBe(200);
    });

    test("an admin can deactivate another admin while one active admin remains", async () => {
        const first = await signupAndLogin("Admin L5a", "adminl5a@example.com");
        const second = await signupAndLogin("Admin L5b", "adminl5b@example.com");

        await makeAdmin(first);
        await makeAdmin(second);

        const res = await setActive(first.token, second.user.id, false);

        expect(res.status).toBe(200);
        expect((await User.findById(first.user.id)).active).toBe(true);
    });
});

describe("Archiving a project", () => {
    test("archived project leaves the switcher list but still opens directly", async () => {
        const owner = await signupAndLogin("Owner A1", "ownera1@example.com");
        const project = await createProject(owner.token, "To Archive");

        await Task.create({
            title: "Old task",
            project: project._id,
            createdBy: owner.user.id
        });

        const archive = await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(owner.token))
            .send({ archived: true });
        expect(archive.status).toBe(200);
        expect(archive.body.project.archived).toBe(true);

        // Gone from the default list
        const list = await request(app)
            .get("/api/projects")
            .set(auth(owner.token));
        expect(list.body.map((p) => String(p._id))).not.toContain(String(project._id));

        // Present when asked for explicitly
        const full = await request(app)
            .get("/api/projects?includeArchived=true")
            .set(auth(owner.token));
        expect(full.body.map((p) => String(p._id))).toContain(String(project._id));

        // Still opens directly
        const direct = await request(app)
            .get(`/api/projects/${project._id}`)
            .set(auth(owner.token));
        expect(direct.status).toBe(200);
        expect(direct.body.archived).toBe(true);

        // Its tasks are not deleted
        const tasks = await request(app)
            .get("/api/tasks")
            .set(auth(owner.token));
        expect(tasks.body.map((t) => t.title)).toContain("Old task");
    });

    test("unarchiving brings it back into the list", async () => {
        const owner = await signupAndLogin("Owner A2", "ownera2@example.com");
        const project = await createProject(owner.token);

        await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(owner.token))
            .send({ archived: true });

        const back = await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(owner.token))
            .send({ archived: false });
        expect(back.status).toBe(200);

        const list = await request(app)
            .get("/api/projects")
            .set(auth(owner.token));
        expect(list.body.map((p) => String(p._id))).toContain(String(project._id));
    });

    test("a plain member gets 403, an outsider gets 404, a global admin can archive", async () => {
        const owner = await signupAndLogin("Owner A3", "ownera3@example.com");
        const member = await signupAndLogin("Member A3", "membera3@example.com");
        const outsider = await signupAndLogin("Outsider A3", "outsidera3@example.com");
        const admin = await signupAndLogin("Admin A3", "admina3@example.com");

        await makeAdmin(admin);

        const project = await createProject(owner.token);

        await request(app)
            .post(`/api/projects/${project._id}/members`)
            .set(auth(owner.token))
            .send({ email: member.email });

        const asMember = await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(member.token))
            .send({ archived: true });
        expect(asMember.status).toBe(403);

        const asOutsider = await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(outsider.token))
            .send({ archived: true });
        expect(asOutsider.status).toBe(404);

        const asAdmin = await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(admin.token))
            .send({ archived: true });
        expect(asAdmin.status).toBe(200);

        // An outsider still cannot open it directly
        const direct = await request(app)
            .get(`/api/projects/${project._id}`)
            .set(auth(outsider.token));
        expect(direct.status).toBe(404);
    });

    test("admin project list includes archived ones with the flag", async () => {
        const owner = await signupAndLogin("Owner A4", "ownera4@example.com");
        const admin = await signupAndLogin("Admin A4", "admina4@example.com");

        await makeAdmin(admin);

        const project = await createProject(owner.token, "Admin Sees Me");

        await request(app)
            .patch(`/api/projects/${project._id}/archive`)
            .set(auth(owner.token))
            .send({ archived: true });

        const res = await request(app)
            .get("/api/projects/admin/all")
            .set(auth(admin.token));

        const found = res.body.find((p) => String(p._id) === String(project._id));
        expect(found).toBeDefined();
        expect(found.archived).toBe(true);
    });
});
