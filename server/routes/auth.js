import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";
import validate from "../middleware/validate.js";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";
import {
    signupSchema,
    loginSchema
} from "../validators/authValidator.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Signup
router.post(
    "/signup",
    validate(signupSchema),
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email already registered"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword
            });

            res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            res.status(500).json({
                message: "Signup failed",
                error: error.message
            });
        }
    }
);

// Login
router.post(
    "/login",
    validate(loginSchema),
    async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({
                    message: "Invalid email or password"
                });
            }

            const isPasswordCorrect = await bcrypt.compare(
                password,
                user.password
            );

            if (!isPasswordCorrect) {
                return res.status(400).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    userId: user._id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            res.status(500).json({
                message: "Login failed",
                error: error.message
            });
        }
    }
);

// Google Login
router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google credential missing"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name,
                email,
                googleId
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Google login failed",
            error: error.message
        });
    }
});

// Get all users (admin only)
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}, "name email role");
        res.json(users);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });
    }
});

// Change user role: admin <-> user (admin only)
router.patch("/users/:id/role", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // Own role maatha koodathu
        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                message: "You can't change your own role"
            });
        }

        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Kadaisi admin ah remove panna koodathu
        if (targetUser.role === "admin" && role === "user") {
            const adminCount = await User.countDocuments({ role: "admin" });
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "At least one admin is required"
                });
            }
        }

        targetUser.role = role;
        await targetUser.save();

        res.json({
            message: "Role updated successfully",
            user: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update role",
            error: error.message
        });
    }
});

export default router;
