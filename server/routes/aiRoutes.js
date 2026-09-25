import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import authMiddleware from "../middleware/authMiddleware.js";
import Task from "../models/Task.js";

const router = express.Router();

router.post("/parse", authMiddleware, async (req, res) => {
    try {
        const { text, project } = req.body;

        if (!text || typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                message: "Please provide a task sentence in the 'text' field"
            });
        }

        if (!project) {
            return res.status(400).json({
                message: "Please provide a project ID in the 'project' field"
            });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        const prompt =
            "Convert this plain-English task sentence into structured task data. " +
            "Return ONLY valid JSON with these fields: " +
            "title: string, " +
            "dueDate: string in YYYY-MM-DD format, or null, " +
            "priority: one of low, medium, high. " +
            "Task sentence: " +
            text.trim();

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        title: {
                            type: "string"
                        },
                        dueDate: {
                            type: ["string", "null"]
                        },
                        priority: {
                            type: "string",
                            enum: ["low", "medium", "high"]
                        }
                    },
                    required: ["title", "dueDate", "priority"]
                }
            }
        });

        const parsedTask = JSON.parse(response.text);

        const newTask = await Task.create({
            title: parsedTask.title,
            dueDate: parsedTask.dueDate
                ? new Date(parsedTask.dueDate)
                : null,
            priority: parsedTask.priority,
            status: "todo",
            project: project,
            createdBy: req.user.userId
        });

        return res.status(201).json({
            message: "Task parsed and created successfully",
            task: newTask
        });

    } catch (error) {
        console.error("AI parser error:", error);

        return res.status(500).json({
            message: "Failed to parse and create task",
            error: error.message
        });
    }
});

export default router;
