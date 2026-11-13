import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GEMINI_API_KEY = "test-key";

const { default: app } = await import("../app.js");
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

async function createProject(token, name) {
    const res = await request(app)
        .post("/api/projects")
        .set(auth(token))
        .send({ name });

    return res.body.project;
}

async function makeTask(owner, project, fields = {}) {
    return Task.create({
        title: "Untitled",
        project: project._id,
        createdBy: owner.user.id,
        ...fields
    });
}

function search(token, query = "") {
    return request(app).get(`/api/search${query}`).set(auth(token));
}

describe("Search", () => {
    test("finds tasks by title or description, case-insensitively", async () => {
        const user = await signupAndLogin("Searcher S1", "searchers1@example.com");
        const project = await createProject(user.token, "Search Project");

        await makeTask(user, project, { title: "Fix the Login page" });
        await makeTask(user, project, {
            title: "Unrelated",
            description: "something about LOGIN timeouts"
        });
        await makeTask(user, project, { title: "Paint the fence" });

        const res = await search(user.token, "?q=login");

        expect(res.status).toBe(200);
        expect(res.body.map((t) => t.title).sort()).toEqual([
            "Fix the Login page",
            "Unrelated"
        ]);
    });

    test("never leaks tasks from a project the user is not a member of", async () => {
        const mine = await signupAndLogin("Mine S2", "mines2@example.com");
        const other = await signupAndLogin("Other S2", "others2@example.com");

        const myProject = await createProject(mine.token, "My Search Project");
        const theirProject = await createProject(other.token, "Their Search Project");

        await makeTask(mine, myProject, { title: "Secret roadmap mine" });
        await makeTask(other, theirProject, { title: "Secret roadmap theirs" });

        const res = await search(mine.token, "?q=secret roadmap");
        expect(res.body.map((t) => t.title)).toEqual(["Secret roadmap mine"]);

        // Asking for their project explicitly still shows nothing
        const forced = await search(
            mine.token,
            `?q=secret&project=${theirProject._id}`
        );
        expect(forced.status).toBe(200);
        expect(forced.body).toHaveLength(0);

        // And with no search words at all, still only my own tasks
        const all = await search(mine.token);
        all.body.forEach((t) =>
            expect(String(t.project._id)).toBe(String(myProject._id))
        );
    });

    test("archived projects are excluded by default and included on request", async () => {
        const user = await signupAndLogin("Archivist S3", "archivists3@example.com");
        const open = await createProject(user.token, "Open S3");
        const old = await createProject(user.token, "Old S3");

        await makeTask(user, open, { title: "zebra open task" });
        await makeTask(user, old, { title: "zebra archived task" });

        await request(app)
            .patch(`/api/projects/${old._id}/archive`)
            .set(auth(user.token))
            .send({ archived: true });

        const byDefault = await search(user.token, "?q=zebra");
        expect(byDefault.body.map((t) => t.title)).toEqual(["zebra open task"]);

        const withArchived = await search(
            user.token,
            "?q=zebra&includeArchived=true"
        );
        expect(withArchived.body.map((t) => t.title).sort()).toEqual([
            "zebra archived task",
            "zebra open task"
        ]);
    });

    test("filters by status, priority, assignee and project", async () => {
        const user = await signupAndLogin("Filter S4", "filters4@example.com");
        const helper = await signupAndLogin("Helper S4", "helpers4@example.com");

        const one = await createProject(user.token, "Filter One");
        const two = await createProject(user.token, "Filter Two");

        await makeTask(user, one, {
            title: "giraffe a",
            status: "completed",
            priority: "high",
            assignedTo: helper.user.id
        });
        await makeTask(user, one, {
            title: "giraffe b",
            status: "todo",
            priority: "low"
        });
        await makeTask(user, two, {
            title: "giraffe c",
            status: "todo",
            priority: "high"
        });

        const titles = async (query) =>
            (await search(user.token, `?q=giraffe${query}`)).body
                .map((t) => t.title)
                .sort();

        expect(await titles("&status=completed")).toEqual(["giraffe a"]);
        expect(await titles("&priority=high")).toEqual(["giraffe a", "giraffe c"]);
        expect(await titles(`&assignee=${helper.user.id}`)).toEqual(["giraffe a"]);
        expect(await titles(`&project=${two._id}`)).toEqual(["giraffe c"]);
        expect(await titles("&status=todo&priority=high")).toEqual(["giraffe c"]);
    });

    test("bad filters are rejected and special characters do not break search", async () => {
        const user = await signupAndLogin("Careful S5", "carefuls5@example.com");
        const project = await createProject(user.token, "Careful Project");

        await makeTask(user, project, { title: "Cost (draft) [v2]" });

        expect((await search(user.token, "?status=banana")).status).toBe(400);
        expect((await search(user.token, "?priority=urgent")).status).toBe(400);
        expect((await search(user.token, "?project=nope")).status).toBe(400);
        expect((await search(user.token, "?assignee=nope")).status).toBe(400);

        const special = await search(
            user.token,
            `?q=${encodeURIComponent("(draft) [v2]")}`
        );
        expect(special.status).toBe(200);
        expect(special.body).toHaveLength(1);
    });

    test("search needs a login", async () => {
        const res = await request(app).get("/api/search?q=anything");
        expect(res.status).toBe(401);
    });
});
