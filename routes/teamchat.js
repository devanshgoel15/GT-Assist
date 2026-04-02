import express from "express";
import { requireAuth, attachStaff } from "../middleware/auth.js";
import { sendTeamMessage, getTeamMessages } from "../db.js";

const router = express.Router();

// All team chat routes require authentication (any role)
router.use(requireAuth);
router.use(attachStaff);

// GET /api/teamchat — get messages
router.get("/", async (req, res) => {
    try {
        const messages = await getTeamMessages(200);
        res.json({ messages });
    } catch (error) {
        console.error("Get team messages error:", error);
        res.status(500).json({ error: "Failed to load messages" });
    }
});

// POST /api/teamchat — send a message
router.post("/", async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ error: "Message content is required" });
        }
        const message = await sendTeamMessage(req.staff.id, content.trim());
        // Return with staff info attached
        message.staff_name = req.staff.name;
        message.staff_role = req.staff.role;
        res.json({ message });
    } catch (error) {
        console.error("Send team message error:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
