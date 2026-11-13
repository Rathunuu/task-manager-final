import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const RECENT_LIMIT = 20;

// My recent notifications + how many are unread (for the bell).
// Every query is filtered by the caller's own id: nobody can read
// someone else's notifications.
router.get("/", authMiddleware, async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ user: req.user.userId })
                .populate("actor", "name")
                .sort({ createdAt: -1 })
                .limit(RECENT_LIMIT),
            Notification.countDocuments({
                user: req.user.userId,
                read: false
            })
        ]);

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch notifications",
            error: error.message
        });
    }
});

// Mark ALL my notifications as read
router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.userId, read: false },
            { read: true }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update notifications",
            error: error.message
        });
    }
});

// Mark ONE of my notifications as read
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        // Someone else's notification looks exactly like a missing one
        const notification = mongoose.isValidObjectId(req.params.id)
            ? await Notification.findOne({
                  _id: req.params.id,
                  user: req.user.userId
              })
            : null;

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        notification.read = true;
        await notification.save();

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update notification",
            error: error.message
        });
    }
});

export default router;
