import mongoose from "mongoose";

// A comment belongs to ONE task. Who may read or write it is decided by
// the task's project membership (checked in the routes), never here.
const commentSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },

        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        }
    },
    {
        // createdAt is filled in automatically
        timestamps: true
    }
);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
