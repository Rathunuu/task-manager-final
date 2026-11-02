// One-time migration: Project.owner  ->  Project.members[{ user, role: "owner" }]
//
// Run from the server folder:
//   node scripts/migrate-project-owners.js --rehearsal   (default, safe)
//   node scripts/migrate-project-owners.js --live
//
// --rehearsal  copies every project into a throwaway database called
//              "migration_rehearsal", runs the migration THERE, checks the
//              result, and drops the copy. The real data is never touched.
// --live       runs the same migration on the real database. Before it
//              changes anything it saves a backup copy of the projects
//              collection as "projects_backup_premigration".
//
// The script is safe to run twice: projects that already have members are
// skipped.

import "dotenv/config";
import mongoose from "mongoose";

const mode = process.argv.includes("--live") ? "live" : "rehearsal";

async function migrate(projects) {
    const stats = { total: 0, migrated: 0, skipped: 0, orphans: 0 };
    const cursor = projects.find({});

    for await (const doc of cursor) {
        stats.total++;

        // Already migrated
        if (Array.isArray(doc.members) && doc.members.length > 0) {
            stats.skipped++;
            continue;
        }

        // Old project with no owner: cannot build a valid member list
        if (!doc.owner) {
            stats.orphans++;
            console.warn(`  ! Project ${doc._id} ("${doc.name}") has no owner, skipped`);
            continue;
        }

        await projects.updateOne(
            { _id: doc._id },
            {
                $set: {
                    members: [
                        {
                            user: doc.owner,
                            role: "owner",
                            addedAt: doc.createdAt || new Date()
                        }
                    ]
                },
                $unset: { owner: "" }
            }
        );

        stats.migrated++;
    }

    return stats;
}

// Every project that had an owner must now have that same person as owner
async function verify(sourceDocs, projects) {
    let bad = 0;

    for (const original of sourceDocs) {
        if (!original.owner) continue;

        const now = await projects.findOne({ _id: original._id });
        const first = now && now.members && now.members[0];

        const ok =
            first &&
            String(first.user) === String(original.owner) &&
            first.role === "owner" &&
            now.owner === undefined;

        if (!ok) {
            bad++;
            console.error(`  X Project ${original._id} does not resolve to its original owner`);
        }
    }

    return bad;
}

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const client = mongoose.connection.getClient();
    const realDb = mongoose.connection.db;
    const realProjects = realDb.collection("projects");

    console.log(`Mode: ${mode.toUpperCase()}`);

    // Snapshot of the data as it is before the migration
    const before = await realProjects.find({}).toArray();
    console.log(`Projects found: ${before.length}`);

    let targetDb;
    let targetProjects;

    if (mode === "rehearsal") {
        targetDb = client.db("migration_rehearsal");
        targetProjects = targetDb.collection("projects");
        await targetProjects.deleteMany({});

        if (before.length > 0) {
            await targetProjects.insertMany(before);
        }

        console.log("Copied projects into migration_rehearsal (real data untouched)");
    } else {
        targetDb = realDb;
        targetProjects = realProjects;

        const existing = await realDb
            .listCollections({ name: "projects_backup_premigration" })
            .toArray();

        if (existing.length === 0 && before.length > 0) {
            await realDb
                .collection("projects_backup_premigration")
                .insertMany(before);
            console.log("Backup saved: projects_backup_premigration");
        } else {
            console.log("Backup already exists, not overwriting it");
        }
    }

    const stats = await migrate(targetProjects);
    const bad = await verify(before, targetProjects);

    console.log("--- Result ---");
    console.log(`Total projects : ${stats.total}`);
    console.log(`Migrated       : ${stats.migrated}`);
    console.log(`Already done   : ${stats.skipped}`);
    console.log(`No owner       : ${stats.orphans}`);
    console.log(`Wrong owner    : ${bad}`);

    if (mode === "rehearsal") {
        await targetDb.dropDatabase();
        console.log("Rehearsal database dropped");
    }

    await mongoose.disconnect();

    if (bad > 0) {
        console.error("VERIFICATION FAILED");
        process.exit(1);
    }

    console.log("VERIFICATION PASSED");
}

main().catch(async (error) => {
    console.error("Migration failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
