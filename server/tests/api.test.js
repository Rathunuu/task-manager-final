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

async function signupAndLogin(name, email, password = "secret123") {
    await request(app)
        .post("/api/auth/signup")
        .send({ name, email, password });

    const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

    return { token: res.body.token, user: res.body.user };
}

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

describe("Auth: signup and login", () => {
    test("signup creates a user with role 'user' and no password in response", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Test User",
                email: "signup@example.com",
                password: "secret123"
            });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe("signup@example.com");
        expect(res.body.user.role).toBe("user");
        expect(res.body.user.password).toBeUndefined();
    });

    test("login with the right password returns a token", async () => {
        await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Login User",
                email: "login@example.com",
                password: "secret123"
            });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "login@example.com", password: "secret123" });

        expect(res.status).toBe(200);
        expect(typeof res.body.token).toBe("string");
        expect(res.body.user.email).toBe("login@example.com");
    });

    test("login with the wrong password is rejected", async () => {
        await request(app)
            .post("/api/auth/signup")
            .send({
                name: "Wrong Pass",
                email: "wrong@example.com",
                password: "secret123"
            });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "wrong@example.com", password: "not-the-password" });

        expect(res.status).toBe(400);
        expect(res.body.token).toBeUndefined();
    });
});

describe("GET /api/auth/users is admin-only", () => {
    test("rejects a request with no token", async () => {
        const res = await request(app).get("/api/auth/users");

        expect(res.status).toBe(401);
    });

    test("rejects a normal (non-admin) user", async () => {
        const { token } = await signupAndLogin(
            "Normal User",
            "normal@example.com"
        );

        const res = await request(app)
            .get("/api/auth/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    test("allows an admin", async () => {
        const { token, user } = await signupAndLogin(
            "Admin User",
            "admin@example.com"
        );

        await User.updateOne({ _id: user.id }, { role: "admin" });

        const res = await request(app)
            .get("/api/auth/users")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("Tasks: category", () => {
    test("creating a task with a category saves that category", async () => {
        const { token, user } = await signupAndLogin(
            "Task User",
            "tasks@example.com"
        );

        const project = await Project.create({
            name: "Test Project",
            owner: user.id
        });

        const res = await request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Buy groceries",
                project: String(project._id),
                category: "Personal"
            });

        expect(res.status).toBe(201);
        expect(res.body.task.category).toBe("Personal");

        const saved = await Task.findById(res.body.task._id);
        expect(saved.category).toBe("Personal");
    });

    test("category defaults to Work when not sent", async () => {
        const { token, user } = await signupAndLogin(
            "Default User",
            "default@example.com"
        );

        const project = await Project.create({
            name: "Default Project",
            owner: user.id
        });

        const res = await request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "No category given",
                project: String(project._id)
            });

        expect(res.status).toBe(201);
        expect(res.body.task.category).toBe("Work");
    });
});