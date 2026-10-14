import jwt from "jsonwebtoken";
import User from "../models/user.js";

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export const adminOnly = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        // Role ah DB la irundhu check panrom, so role maathina udane work aagum
        const user = await User.findById(userId).select("role");

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access only"
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export default authMiddleware;
