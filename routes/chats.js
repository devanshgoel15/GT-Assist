import express from "express";
import { getOrCreateUser, getChatHistory, clearChatHistory } from "../db.js";

const router = express.Router();

// Get chat history for current user
router.get("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ chats: [] });
        }
        const user = await getOrCreateUser(req.session.userId);
        const chats = await getChatHistory(user.id);
        res.json({ chats });
    } catch (error) {
        console.error("Chat history error:", error);
        res.status(500).json({ error: "Failed to get chat history" });
    }
});

// Clear chat history
router.delete("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ success: true });
        }
        const user = await getOrCreateUser(req.session.userId);
        await clearChatHistory(user.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Clear chat error:", error);
        res.status(500).json({ error: "Failed to clear chat history" });
    }
});

export default router;
