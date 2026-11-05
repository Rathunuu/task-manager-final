import express from "express";
import Task from "../models/Task.js";
import User from "../models/user.js";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
    loadProject,
    canWorkInProject,
    memberProjectIds
} from "../utils/projectAccess.js";
import {
    taskCreateSchema,
    taskUpdateSchema
} from "../validators/taskvalidator.js";

const router = express.Router();

// ADMIN: all users with their tasks + progress
router.get("/admin/overview", authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}, "name email role");
        const tasks = await Task.find()
            .populate("project", "name")
            .sort({ createdAt: -1 });

        const overview = users.map((u) => {
            const userTasks = tasks.filter(
                (t) => String(t.assignedTo) === String(u._id)
            );
            const completed = userTasks.filter(
                (t) => t.status === "completed"
            ).length;

            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                total: userTasks.length,
                completed,
                tasks: userTasks
            };
        });

        res.json(overview);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch overview",
            error: error.message
        });
    }
});

// ADMIN: assign a task to one or many users, inside a REAL shared project.
//
// What this used to do: for every assignee it found-or-created a separate
// "Assigned by Admin" project owned by just that person (a workaround,
// because a project could only have one owner).
//
// What it does now: the admin picks ONE existing target project. Each
// assignee is added to that project as a member (if not already one), and
// the task is created directly in it. No duplicate projects are created.
//
// Old "Assigned by Admin" projects already in the database: they are left
// exactly as they are. The migration made each person the owner of theirs
// and they hold real tasks, so deleting or merging them would lose data.
// This route simply never creates new ones.
router.post("/admin/assign", authMiddleware, adminOnly, async (req, res) => {
    try {
        const {
            title,
            description,
            dueDate,
            priority,
            project,
            assignedTo
        } = req.body;

        const userIds = [
            ...new Set(
                (Array.isArray(assignedTo)
                    ? assignedTo
                    : assignedTo
                    ? [assignedTo]
                    : []
                ).map(String)
            )
        ];

        if (!title || !title.trim() || userIds.length === 0) {
            return res.status(400).json({
                message: "title and at least one user are required"
            });
        }

        if (!project) {
            return res.status(400).json({
                message: "A target project is required"
            });
        }

        const targetProject = await loadProject(project);

        if (!targetProject) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const users = await User.find({ _id: { $in: userIds } }, "_id");

        if (users.length !== userIds.length) {
            return res.status(400).json({
                message: "One or more selected users do not exist"
            });
        }

        // Add every assignee to the real project (skip existing members)
        let newlyAdded = 0;

        for (const userId of userIds) {
            if (!targetProject.isMember(userId)) {
                targetProject.members.push({ user: userId, role: "member" });
                newlyAdded++;
            }
        }

        if (newlyAdded > 0) {
            await targetProject.save();
        }

        // Create the task directly in that project, one per assignee
        const createdTasks = [];

        for (const userId of userIds) {
            const task = await Task.create({
