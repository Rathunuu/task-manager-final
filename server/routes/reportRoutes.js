import express from "express";
import Project from "../models/project.js";
import Task from "../models/Task.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { isGlobalAdmin } from "../utils/projectAccess.js";

const router = express.Router();

const STATUSES = ["todo", "in-progress", "in-review", "completed"];

// Which projects may this person see in a report?
//   - a normal user: the projects they are a member of
//   - a global admin: every project
// Archived projects are left out unless ?includeArchived=true.
async function reportProjects(req) {
    const filter = {};

    if (!(await isGlobalAdmin(req.user.userId))) {
        filter["members.user"] = req.user.userId;
    }

    if (req.query.includeArchived !== "true") {
        filter.archived = { $ne: true };
    }

    return Project.find(filter, "name archived").sort({ name: 1 });
}

// Progress per project: task count per status + percent completed
router.get("/progress", authMiddleware, async (req, res) => {
    try {
        const projects = await reportProjects(req);
        const ids = projects.map((p) => p._id);

        const tasks = await Task.find({ project: { $in: ids } }, "project status");

        const report = projects.map((project) => {
            const projectTasks = tasks.filter(
                (t) => String(t.project) === String(project._id)
            );

            const byStatus = {};

            for (const status of STATUSES) {
                byStatus[status] = projectTasks.filter(
                    (t) => t.status === status
                ).length;
            }

            const total = projectTasks.length;

            return {
                projectId: project._id,
                name: project.name,
                archived: project.archived === true,
                total,
                byStatus,
                // No tasks yet = 0%, never a divide-by-zero
                percentComplete:
                    total === 0
                        ? 0
                        : Math.round((byStatus.completed / total) * 100)
            };
        });

        res.json(report);
    } catch (error) {
        res.status(500).json({
            message: "Failed to build progress report",
            error: error.message
        });
    }
});

// Overdue tasks: due date has passed and the task is not completed
router.get("/overdue", authMiddleware, async (req, res) => {
    try {
        const projects = await reportProjects(req);
        const ids = projects.map((p) => p._id);

        const tasks = await Task.find({
            project: { $in: ids },
            status: { $ne: "completed" },
            dueDate: { $ne: null, $lt: new Date() }
        })
            .populate("project", "name")
            .populate("assignedTo", "name email")
            .sort({ dueDate: 1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({
            message: "Failed to build overdue report",
            error: error.message
        });
    }
});

export default router;
