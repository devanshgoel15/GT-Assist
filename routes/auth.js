import express from "express";
import bcrypt from "bcryptjs";
import { getStaffByEmail, getStaffById } from "../db.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const staff = await getStaffByEmail(email.toLowerCase().trim());
        if (!staff) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isValid = await bcrypt.compare(password, staff.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Set staff session
        req.session.staffId = staff.id;

        res.json({
            staff: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// GET /api/auth/me — current staff info
router.get("/me", async (req, res) => {
    try {
        if (!req.session.staffId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const staff = await getStaffById(req.session.staffId);
        if (!staff) {
            return res.status(401).json({ error: "Staff account not found" });
        }

        res.json({ staff });
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({ error: "Failed to get user info" });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    req.session.staffId = null;
    res.json({ success: true });
});

export default router;
