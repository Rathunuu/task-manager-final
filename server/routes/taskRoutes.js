import express from "express";
import Task from "../models/Task.js";
import authMiddleware from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
    taskCreateSchema,
    taskUpdateSchema
} from "../validators/taskValidator.js";

const router = express.Router();

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

// Update task
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
                    createdBy: req.user.userId
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