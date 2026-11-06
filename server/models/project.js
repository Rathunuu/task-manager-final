import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        role: {
            type: String,
            enum: ["owner", "member"],
            default: "member"
        },

        addedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        // Replaces the old single "owner" field.
        // A project is shared by everyone in this list.
        members: {
            type: [memberSchema],
            validate: [
                {
                    validator: function (members) {
                        return members.some((m) => m.role === "owner");
                    },
                    message: "A project must have at least one owner"
                },
                {
                    validator: function (members) {
                        const ids = members.map((m) => String(m.user));
                        return new Set(ids).size === ids.length;
                    },
                    message: "A user can only be a member of a project once"
                }
            ]
        }
    },
    {
        timestamps: true
    }
);

// Faster "all projects this user belongs to" lookups
projectSchema.index({ "members.user": 1 });

// Is this user any kind of member (owner or member)?
projectSchema.methods.isMember = function (userId) {
    return this.members.some((m) => String(m.user) === String(userId));
};

// Is this user an owner of the project?
projectSchema.methods.isOwner = function (userId) {
    return this.members.some(
        (m) => String(m.user) === String(userId) && m.role === "owner"
    );
};

const Project = mongoose.model("Project", projectSchema);

export default Project;
