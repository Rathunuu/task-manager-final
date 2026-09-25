import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import validate from "../middleware/validate.js";
import {
    signupSchema,
    loginSchema
} from "../validators/authValidator.js";

const router = express.Router();

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

export default router;