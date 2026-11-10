import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            }
        },

        googleId: {
            type: String,
            default: null
        },

        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user"
        },

        // What "active" means:
        //   true  -> a normal account.
        //   false -> DEACTIVATED: the person has left the team.
        //            They can no longer log in, and any token they already
        //            hold stops working (checked on every request).
        //
        // Deactivating NEVER deletes anything. Their tasks, comments and
        // project memberships stay exactly as they were, so project history
        // still reads correctly ("Priya completed this task"). Users with
        // history are never hard-deleted; reactivating just flips this back.
        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

export default User;
