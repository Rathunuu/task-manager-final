import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Task from "../models/Task.js";
import User from "../models/user.js";
import Comment from "../models/Comment.js";
import authMiddleware from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { loadProject, canWorkInProject } from "../utils/projectAccess.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

const commentSchema = z.object({
    text: z
        .string()
        .trim()
        .min(1, "Comment cannot be empty")
        .max(2000, "Comment is too long (2000 characters max)")
});

// Find the task AND check the caller belongs to its project.
// Sends the error itself and returns null when access is denied.
// Not a member -> 404, exactly as if the task did not exist.
async function loadTaskForMember(taskId, userId, res) {
    const task = mongoose.isValidObjectId(taskId)
        ? await Task.findById(taskId)
        : null;

    const project = task ? await loadProject(task.project) : null;

    if (!canWorkInProject(project, userId)) {
        res.status(404).json({ message: "Task not found" });
        return null;
    }

    return task;
}

// Read the comment thread of a task (any member of the task's project)
router.get("/:id/comments", authMiddleware, async (req, res) => {
    try {
        const task = await loadTaskForMember(req.params.id, req.user.userId, res);

        if (!task) {
            return;
        }

        const comments = await Comment.find({ task: task._id })
            .populate("author", "name email")
            .sort({ createdAt: 1 });

        res.json(comments);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch comments",
            error: error.message
        });
    }
});

// Post a comment (any member of the task's project)
router.post(
    "/:id/comments",
    authMiddleware,
    validate(commentSchema),
    async (req, res) => {
        try {
            const task = await loadTaskForMember(
                req.params.id,
                req.user.userId,
                res
            );

            if (!task) {
                return;
            }

            const comment = await Comment.create({
                task: task._id,
                author: req.user.userId,
                text: req.body.text
            });

            await comment.populate("author", "name email");

            // Tell the task's creator and assignee (never the author)
            const author = await User.findById(req.user.userId).select("name");

            await notify({
                users: [task.createdBy, task.assignedTo],
                actor: req.user.userId,
                type: "comment",
                message: `${author ? author.name : "Someone"} commented on "${task.title}"`,
                task: task._id,
                project: task.project
            });

            res.status(201).json({
                message: "Comment added",
                comment
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to add comment",
                error: error.message
            });
        }
    }
);

export default router;
