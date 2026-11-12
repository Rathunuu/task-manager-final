import mongoose from "mongoose";

// One notification is addressed to ONE person (user).
// It is created when something happens that concerns them:
//   comment          -> someone commented on a task they created / are assigned
//   assignment       -> a task was assigned to them
//   added_to_project -> they were added to a project as a member
const notificationSchema = new mongoose.Schema(
    {
        // The person who receives it
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // The person who caused it
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: ["comment", "assignment", "added_to_project"],
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        // Optional links, so the UI can open the right place
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null
        },

        read: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
