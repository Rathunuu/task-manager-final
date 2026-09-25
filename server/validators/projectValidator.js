import { z } from "zod";

export const projectCreateSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional().default("")
});

export const projectUpdateSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional().default("")
});