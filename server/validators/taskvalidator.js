import { z } from "zod";

export const taskCreateSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    description: z.string().optional().default(""),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    status: z.enum(["todo", "in-progress", "completed"]).optional().default("todo"),
    project: z.string().min(1, "Project ID is required"),
    assignedTo: z.string().optional().nullable()
});

export const taskUpdateSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    description: z.string().optional().default(""),
    dueDate: z.string().optional().nullable(),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    status: z.enum(["todo", "in-progress", "completed"]).optional().default("todo"),
    project: z.string().min(1, "Project ID is required"),
    assignedTo: z.string().optional().nullable()
});