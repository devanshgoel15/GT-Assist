import express from "express";
import { getOrCreateUser, updateUser } from "../db.js";

const router = express.Router();

// Get or create user from session
router.get("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            req.session.userId = req.sessionID;
        }
        const user = await getOrCreateUser(req.session.userId);
        res.json({ user });
    } catch (error) {
        console.error("User route error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

// Update user name/preferences
router.put("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: "No session" });
        }
        const { name, language_pref } = req.body;
        const user = await updateUser(req.session.userId, { name, language_pref });
        res.json({ user });
    } catch (error) {
        console.error("User update error:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
