import express from "express";
import { z } from "zod";
import Project from "../models/project.js";
import User from "../models/user.js";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
    projectCreateSchema,
    projectUpdateSchema
} from "../validators/projectValidator.js";
import {
    loadProject,
    canWorkInProject,
    canManageMembers
} from "../utils/projectAccess.js";

const router = express.Router();

// Add a member by email OR by user id
const addMemberSchema = z
    .object({
        email: z.string().email("Enter a valid email").optional(),
        userId: z.string().optional()
    })
    .refine((data) => data.email || data.userId, {
        message: "Provide an email or a userId"
    });

// Shape used when listing members
function formatMembers(project) {
    return project.members.map((m) => ({
        user: m.user,
        role: m.role,
        addedAt: m.addedAt
    }));
}

// Shared check for the three members endpoints.
// Sends the error response itself and returns false when access is denied:
//   - not a member at all -> 404 (do not reveal the project exists)
//   - member but not owner -> 403
async function ensureCanManage(project, userId, res, action) {
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return false;
    }

    if (await canManageMembers(project, userId)) {
        return true;
    }

    if (project.isMember(userId)) {
        res.status(403).json({
            message: `Only a project owner can ${action}`
        });
    } else {
        res.status(404).json({ message: "Project not found" });
    }

    return false;
}

// Get every project the logged-in user is a MEMBER of
router.get("/", authMiddleware, async (req, res) => {
    try {
        const projects = await Project.find({
            "members.user": req.user.userId
        }).sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch projects",
            error: error.message
        });
    }
});

// ADMIN: every project in the system (id + name only).
// The Admin Dashboard needs this to pick the target project for a task,
// because an admin is not necessarily a member of every project.
router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
        const projects = await Project.find({}, "name").sort({ name: 1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch projects",
            error: error.message
        });
    }
});

// Create project: the creator becomes its first owner
router.post(
    "/",
    authMiddleware,
    validate(projectCreateSchema),
    async (req, res) => {
        try {
            const { name, description } = req.body;

            const project = await Project.create({
                name,
                description,
                members: [{ user: req.user.userId, role: "owner" }]
            });

            res.status(201).json({
                message: "Project created successfully",
                project
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to create project",
                error: error.message
            });
        }
    }
);

// Update project (owners only)
router.put(
    "/:id",
    authMiddleware,
    validate(projectUpdateSchema),
    async (req, res) => {
        try {
            const project = await loadProject(req.params.id);

            // Not a member: act as if the project does not exist
            if (!canWorkInProject(project, req.user.userId)) {
                return res.status(404).json({
                    message: "Project not found"
                });
            }

            if (!project.isOwner(req.user.userId)) {
                return res.status(403).json({
                    message: "Only a project owner can edit the project"
                });
            }

            project.name = req.body.name;
            project.description = req.body.description;
            await project.save();

            res.json({
                message: "Project updated successfully",
                project
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to update project",
                error: error.message
            });
        }
    }
);

// Delete project (owners only)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const project = await loadProject(req.params.id);

        if (!canWorkInProject(project, req.user.userId)) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (!project.isOwner(req.user.userId)) {
            return res.status(403).json({
                message: "Only a project owner can delete the project"
            });
        }

        await project.deleteOne();

        res.json({
            message: "Project deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete project",
            error: error.message
        });
    }
});

// List members with roles (owners or a global admin)
router.get("/:id/members", authMiddleware, async (req, res) => {
    try {
        const project = await loadProject(req.params.id);

        if (!(await ensureCanManage(project, req.user.userId, res, "view the member list"))) {
            return;
        }

        await project.populate("members.user", "name email");

        res.json(formatMembers(project));
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch members",
            error: error.message
        });
    }
});

// Add a member by email or user id (owners or a global admin)
router.post(
    "/:id/members",
    authMiddleware,
    validate(addMemberSchema),
    async (req, res) => {
        try {
            const project = await loadProject(req.params.id);

            if (!(await ensureCanManage(project, req.user.userId, res, "add members"))) {
                return;
            }

            const { email, userId } = req.body;

            const userToAdd = email
                ? await User.findOne({ email: email.toLowerCase().trim() })
                : await User.findById(userId).catch(() => null);

            if (!userToAdd) {
                return res.status(404).json({
                    message: "No user found with that email or id"
                });
            }

            if (project.isMember(userToAdd._id)) {
                return res.status(409).json({
                    message: "That user is already a member of this project"
                });
            }

            project.members.push({ user: userToAdd._id, role: "member" });
            await project.save();

            await project.populate("members.user", "name email");

            res.status(201).json({
                message: "Member added successfully",
                members: formatMembers(project)
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to add member",
                error: error.message
            });
        }
    }
);

// Remove a member (owners or a global admin)
router.delete(
    "/:id/members/:userId",
    authMiddleware,
    async (req, res) => {
        try {
            const project = await loadProject(req.params.id);

            if (!(await ensureCanManage(project, req.user.userId, res, "remove members"))) {
                return;
            }

            const target = project.members.find(
                (m) => String(m.user) === String(req.params.userId)
            );

            if (!target) {
                return res.status(404).json({
                    message: "That user is not a member of this project"
                });
            }

            // A project must always keep at least one owner
            const ownerCount = project.members.filter(
                (m) => m.role === "owner"
            ).length;

            if (target.role === "owner" && ownerCount === 1) {
                return res.status(400).json({
                    message: "Cannot remove the only owner of a project"
                });
            }

            project.members = project.members.filter(
                (m) => String(m.user) !== String(req.params.userId)
            );
            await project.save();

            await project.populate("members.user", "name email");

            res.json({
                message: "Member removed successfully",
                members: formatMembers(project)
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to remove member",
                error: error.message
            });
        }
    }
);

export default router;
