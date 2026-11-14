import express from "express";
import mongoose from "mongoose";
import Project from "../models/project.js";
import Task from "../models/Task.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const STATUSES = ["todo", "in-progress", "in-review", "completed"];
const PRIORITIES = ["low", "medium", "high"];
const MAX_RESULTS = 50;

// Make user text safe to use inside a regular expression
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Search tasks (titles and descriptions) across the projects the caller is a
// MEMBER of. Query string (all optional):
//   q                 words to look for in title / description
//   project           only this project (must be one of the caller's)
//   assignee          only tasks assigned to this user id
//   status            todo | in-progress | in-review | completed
//   priority          low | medium | high
//   includeArchived   "true" to also search archived projects
//
// Archived projects are left out by default, the same as the project list.
router.get("/", authMiddleware, async (req, res) => {
    try {
        const { q, project, assignee, status, priority } = req.query;

        if (status && !STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid status filter" });
        }

        if (priority && !PRIORITIES.includes(priority)) {
            return res.status(400).json({ message: "Invalid priority filter" });
        }

        if (project && !mongoose.isValidObjectId(project)) {
            return res.status(400).json({ message: "Invalid project filter" });
        }

        if (assignee && !mongoose.isValidObjectId(assignee)) {
            return res.status(400).json({ message: "Invalid assignee filter" });
        }

        // Only projects the caller belongs to. This is the privacy rule:
        // nothing outside this list can ever appear in a result.
        const projectFilter = { "members.user": req.user.userId };

        if (req.query.includeArchived !== "true") {
            projectFilter.archived = { $ne: true };
        }

        let projectIds = await Project.find(projectFilter).distinct("_id");

        // A project filter can only narrow the list, never widen it
        if (project) {
            projectIds = projectIds.filter((id) => String(id) === String(project));
        }

        const filter = { project: { $in: projectIds } };

        if (assignee) filter.assignedTo = assignee;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const text = typeof q === "string" ? q.trim() : "";

        if (text) {
            const pattern = new RegExp(escapeRegex(text), "i");

            filter.$or = [{ title: pattern }, { description: pattern }];
        }

        const tasks = await Task.find(filter)
            .populate("project", "name")
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 })
            .limit(MAX_RESULTS);

        res.json(tasks);
    } catch (error) {
        res.status(500).json({
            message: "Search failed",
            error: error.message
        });
    }
});

export default router;
