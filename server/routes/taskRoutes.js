import express from "express";
import Task from "../models/Task.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
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

// ADMIN: assign a task to a user
router.post("/admin/assign", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, description, dueDate, priority, assignedTo } = req.body;

        if (!title || !assignedTo) {
            return res.status(400).json({
                message: "title and assignedTo are required"
            });
        }

        // User oda "Assigned by Admin" project find pannu, illa na create pannu
        let project = await Project.findOne({
            owner: assignedTo,
            name: "Assigned by Admin"
        });

        if (!project) {
            project = await Project.create({
                name: "Assigned by Admin",
                description: "Tasks assigned by admin",
                owner: assignedTo
            });
        }

        const task = await Task.create({
            title,
            description,
            dueDate,
            priority,
            project: project._id,
            assignedTo,
            createdBy: req.user.userId
        });

        res.status(201).json({
            message: "Task assigned successfully",
            task
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to assign task",
            error: error.message
        });
    }
});

// Get all tasks of logged-in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({
            $or: [
                { createdBy: req.user.userId },
                { assignedTo: req.user.userId }
            ]
        })
            .populate("project", "name")
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch tasks",
            error: error.message
        });
    }
});

// Create task
router.post(
    "/",
    authMiddleware,
    validate(taskCreateSchema),
    async (req, res) => {
        try {
            const {
                title,
                description,
                dueDate,
                priority,
                status,
                project,
                assignedTo
            } = req.body;

            const task = await Task.create({
                title,
                description,
                dueDate,
                priority,
                status,
                project,
                assignedTo: assignedTo || null,
                createdBy: req.user.userId
            });

            res.status(201).json({
                message: "Task created successfully",
                task
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to create task",
                error: error.message
            });
        }
    }
);

// Update task (creator OR assigned user)
router.put(
    "/:id",
    authMiddleware,
    validate(taskUpdateSchema),
    async (req, res) => {
        try {
            const {
                title,
                description,
                dueDate,
                priority,
                status,
                project,
                assignedTo
            } = req.body;

            const task = await Task.findOneAndUpdate(
                {
                    _id: req.params.id,
                    $or: [
                        { createdBy: req.user.userId },
                        { assignedTo: req.user.userId }
                    ]
                },
                {
                    title,
                    description,
                    dueDate,
                    priority,
                    status,
                    project,
                    assignedTo: assignedTo || null
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!task) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.json({
                message: "Task updated successfully",
                task
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to update task",
                error: error.message
            });
        }
    }
);

// Delete task
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user.userId
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete task",
            error: error.message
        });
    }
});

export default router;
