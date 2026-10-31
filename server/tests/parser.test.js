import { jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GEMINI_API_KEY = "test-key";

// Fake Gemini: no real API call is ever made from a test.
const mockGenerateContent = jest.fn();

jest.unstable_mockModule("@google/genai", () => ({
    GoogleGenAI: class {
        constructor() {
            this.models = { generateContent: mockGenerateContent };
        }
    }
}));

const { default: app } = await import("../app.js");
const { default: Project } = await import("../models/project.js");
const { default: Task } = await import("../models/Task.js");

let mongod;
let token;
let projectId;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    await request(app)
        .post("/api/auth/signup")
        .send({
            name: "Parser User",
            email: "parser@example.com",
            password: "secret123"
        });

    const login = await request(app)
        .post("/api/auth/login")
        .send({ email: "parser@example.com", password: "secret123" });

    token = login.body.token;

    const project = await Project.create({
        name: "Parser Project",
        owner: login.body.user.id
    });

    projectId = String(project._id);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(() => {
    mockGenerateContent.mockReset();
});

function parse(text) {
    return request(app)
        .post("/api/tasks/parse")
        .set("Authorization", `Bearer ${token}`)
        .send({ text, project: projectId });
}

describe("POST /api/tasks/parse (mocked LLM)", () => {
    test("a well-formed AI response becomes a saved task with the right date", async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                title: "call the vendor",
                dueDate: "2026-11-06",
                priority: "high"
            })
        });

        const res = await parse("call the vendor next Friday, it's urgent");

        expect(res.status).toBe(201);
        expect(res.body.task.title).toBe("call the vendor");
        expect(res.body.task.priority).toBe("high");

        const saved = await Task.findById(res.body.task._id);
        expect(saved).not.toBeNull();
        expect(saved.dueDate.toISOString().slice(0, 10)).toBe("2026-11-06");

        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test("a non-JSON AI response is rejected with 422", async () => {
        mockGenerateContent.mockResolvedValue({ text: "Sure! Here is your task." });

        const res = await parse("anything");

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/not valid JSON/i);
    });

    test("an AI response missing a required field is rejected with 422", async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({ title: "no date or priority" })
        });

        const res = await parse("anything");

        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/missing required field/i);
    });
});
