import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import authMiddleware from "../middleware/authMiddleware.js";
import Task from "../models/Task.js";

const router = express.Router();

const PRIORITIES = ["low", "medium", "high"];
const REQUIRED_FIELDS = ["title", "dueDate", "priority"];

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

        // Today's date, so the model can resolve "tomorrow", "next Friday", etc.
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const weekday = now.toLocaleDateString("en-US", {
            weekday: "long",
            timeZone: "UTC"
        });

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        const prompt =
            "Convert this plain-English task sentence into structured task data. " +
            "Return ONLY valid JSON with these fields: " +
            "title: string, " +
            "dueDate: string in YYYY-MM-DD format, or null, " +
            "priority: one of low, medium, high. " +
            "Today's date is " + today + " (" + weekday + "). " +
            "If the sentence contains a relative date such as 'tomorrow', " +
            "'next Friday', 'next Monday' or 'in 3 days', resolve it against " +
            "today's date into a real YYYY-MM-DD value. " +
            "Use null for dueDate only if the sentence has no date at all. " +
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
                            enum: PRIORITIES
                        }
                    },
                    required: REQUIRED_FIELDS
                }
            }
        });

        // 1) Response must be valid JSON
        let parsedTask;
        try {
            parsedTask = JSON.parse(response.text);
        } catch (parseError) {
            return res.status(422).json({
                message: "AI response was not valid JSON",
                error: parseError.message
            });
        }

        if (
            !parsedTask ||
            typeof parsedTask !== "object" ||
            Array.isArray(parsedTask)
        ) {
            return res.status(422).json({
                message: "AI response was not a JSON object"
            });
        }

        // 2) Required fields must be present
        const missing = REQUIRED_FIELDS.filter(
            (field) => !(field in parsedTask)
        );

        if (missing.length > 0) {
            return res.status(422).json({
                message:
                    "AI response is missing required field(s): " +
                    missing.join(", ")
            });
        }

        if (
            typeof parsedTask.title !== "string" ||
            !parsedTask.title.trim()
        ) {
            return res.status(422).json({
                message: "AI response has an empty or invalid 'title'"
            });
        }

        if (!PRIORITIES.includes(parsedTask.priority)) {
            return res.status(422).json({
                message:
                    "AI response has an invalid 'priority': " +
                    parsedTask.priority
            });
        }

        let dueDate = null;

        if (parsedTask.dueDate !== null) {
            const validFormat =
                typeof parsedTask.dueDate === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(parsedTask.dueDate);

            const parsedDate = validFormat
                ? new Date(parsedTask.dueDate)
                : null;

            if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
                return res.status(422).json({
                    message:
                        "AI response has an invalid 'dueDate': " +
                        parsedTask.dueDate
                });
            }

            dueDate = parsedDate;
        }

        // 3) Task.create's own validation
        let newTask;
        try {
            newTask = await Task.create({
                title: parsedTask.title.trim(),
                dueDate,
                priority: parsedTask.priority,
                status: "todo",
                project: project,
                createdBy: req.user.userId
            });
        } catch (createError) {
            if (
                createError.name === "ValidationError" ||
                createError.name === "CastError"
            ) {
                return res.status(422).json({
                    message: "Parsed task failed validation",
                    error: createError.message
                });
            }
            throw createError;
        }

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
