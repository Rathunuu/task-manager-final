import express from "express";
import Project from "../models/Project.js";
import authMiddleware from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import {
    projectCreateSchema,
    projectUpdateSchema
} from "../validators/projectValidator.js";

const router = express.Router();

// Get all projects of logged-in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const projects = await Project.find({
            owner: req.user.userId
        }).sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch projects",
            error: error.message
        });
    }
});

// Create project
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
                owner: req.user.userId
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

// Update project
router.put(
    "/:id",
    authMiddleware,
    validate(projectUpdateSchema),
    async (req, res) => {
        try {
            const { name, description } = req.body;

            const project = await Project.findOneAndUpdate(
                {
                    _id: req.params.id,
                    owner: req.user.userId
                },
                {
                    name,
                    description
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!project) {
                return res.status(404).json({
                    message: "Project not found"
                });
            }

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

// Delete project
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

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

export default router;