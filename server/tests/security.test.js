import { jest } from "@jest/globals";
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

describe("Login lockout", () => {
    test("5 wrong passwords lock the email, even for the right password", async () => {
        const user = await signupAndLogin("Lock User", "lockuser@example.com");
        resetLoginAttempts();

        for (let i = 0; i < 5; i++) {
            const bad = await request(app)
                .post("/api/auth/login")
                .send({ email: user.email, password: "wrong-password" });
            expect(bad.status).toBe(400);
        }

        const locked = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: user.password });

        expect(locked.status).toBe(429);
        expect(locked.body.message).toMatch(/too many failed login attempts/i);
        expect(locked.body.message).toMatch(/minute/i);
    });

    test("another email is not affected", async () => {
        const locked = await signupAndLogin("Lock A", "locka@example.com");
        const other = await signupAndLogin("Lock B", "lockb@example.com");
        resetLoginAttempts();

        for (let i = 0; i < 5; i++) {
            await request(app)
                .post("/api/auth/login")
                .send({ email: locked.email, password: "wrong-password" });
        }

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: other.email, password: other.password });

        expect(res.status).toBe(200);
    });

    test("a successful login resets the counter", async () => {
        const user = await signupAndLogin("Reset User", "resetuser@example.com");
        resetLoginAttempts();

        for (let i = 0; i < 4; i++) {
            await request(app)
                .post("/api/auth/login")
                .send({ email: user.email, password: "wrong-password" });
        }

        const good = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: user.password });
        expect(good.status).toBe(200);

        // 4 more wrong attempts: still not locked, because the counter reset
        for (let i = 0; i < 4; i++) {
            await request(app)
                .post("/api/auth/login")
                .send({ email: user.email, password: "wrong-password" });
        }

        const again = await request(app)
            .post("/api/auth/login")
            .send({ email: user.email, password: user.password });
        expect(again.status).toBe(200);
    });

    test("the lock ends after the cooldown", async () => {
        const user = await signupAndLogin("Cool User", "cooluser@example.com");
        resetLoginAttempts();

        for (let i = 0; i < 5; i++) {
            await request(app)
                .post("/api/auth/login")
                .send({ email: user.email, password: "wrong-password" });
        }

        const realNow = Date.now();
        const spy = jest.spyOn(Date, "now").mockReturnValue(realNow + 16 * 60 * 1000);

        try {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: user.email, password: user.password });

            expect(res.status).toBe(200);
        } finally {
            spy.mockRestore();
        }
    });
});

describe("Reports", () => {
    test("progress shows the percent completed per status", async () => {
        const owner = await signupAndLogin("Owner R1", "ownerr1@example.com");
        const project = await createProject(owner.token, "Progress Project");

        const statuses = ["completed", "completed", "in-progress", "todo"];

        for (const status of statuses) {
            await Task.create({
                title: `Task ${status}`,
                project: project._id,
                status,
                createdBy: owner.user.id
            });
        }

        const res = await request(app)
            .get("/api/reports/progress")
            .set(auth(owner.token));

        expect(res.status).toBe(200);

        const row = res.body.find((r) => String(r.projectId) === String(project._id));
        expect(row.total).toBe(4);
        expect(row.byStatus.completed).toBe(2);
        expect(row.byStatus["in-progress"]).toBe(1);
        expect(row.byStatus.todo).toBe(1);
        expect(row.percentComplete).toBe(50);
    });

    test("a project with no tasks shows 0%", async () => {
        const owner = await signupAndLogin("Owner R2", "ownerr2@example.com");
        const project = await createProject(owner.token, "Empty Project");

        const res = await request(app)
            .get("/api/reports/progress")
            .set(auth(owner.token));

        const row = res.body.find((r) => String(r.projectId) === String(project._id));
        expect(row.total).toBe(0);
        expect(row.percentComplete).toBe(0);
    });

    test("overdue lists only late, unfinished tasks from my projects", async () => {
        const owner = await signupAndLogin("Owner R3", "ownerr3@example.com");
        const other = await signupAndLogin("Other R3", "otherr3@example.com");

        const mine = await createProject(owner.token, "My Overdue");
        const theirs = await createProject(other.token, "Not Mine");

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await Task.create({ title: "Late and open", project: mine._id, dueDate: yesterday, createdBy: owner.user.id });
        await Task.create({ title: "Late but done", project: mine._id, dueDate: yesterday, status: "completed", createdBy: owner.user.id });
        await Task.create({ title: "Not due yet", project: mine._id, dueDate: tomorrow, createdBy: owner.user.id });
        await Task.create({ title: "No due date", project: mine._id, createdBy: owner.user.id });
        await Task.create({ title: "Someone else's late task", project: theirs._id, dueDate: yesterday, createdBy: other.user.id });

        const res = await request(app)
            .get("/api/reports/overdue")
            .set(auth(owner.token));

        expect(res.status).toBe(200);

        const titles = res.body.map((t) => t.title);
        expect(titles).toContain("Late and open");
        expect(titles).not.toContain("Late but done");
        expect(titles).not.toContain("Not due yet");
        expect(titles).not.toContain("No due date");
        expect(titles).not.toContain("Someone else's late task");
    });

    test("an admin sees overdue tasks from every project", async () => {
        const owner = await signupAndLogin("Owner R4", "ownerr4@example.com");
        const admin = await signupAndLogin("Admin R4", "adminr4@example.com");

        await makeAdmin(admin);

        const project = await createProject(owner.token, "Admin Overdue View");

        await Task.create({
            title: "Late task admin can see",
            project: project._id,
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            createdBy: owner.user.id
        });

        const res = await request(app)
            .get("/api/reports/overdue")
            .set(auth(admin.token));

        expect(res.body.map((t) => t.title)).toContain("Late task admin can see");
    });

    test("reports need a login", async () => {
        const res = await request(app).get("/api/reports/progress");
        expect(res.status).toBe(401);
    });
});
