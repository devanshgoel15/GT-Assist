import express from "express";
import { getOrCreateUser, createTicket, getTickets, updateTicket } from "../db.js";

const router = express.Router();

// Create a new ticket
router.post("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: "No session" });
        }
        const user = await getOrCreateUser(req.session.userId);
        const { subject, description, priority } = req.body;

        if (!subject) {
            return res.status(400).json({ error: "Subject is required" });
        }

        const ticket = await createTicket(user.id, subject, description || "", priority || "normal");
        res.json({ ticket });
    } catch (error) {
        console.error("Create ticket error:", error);
        res.status(500).json({ error: "Failed to create ticket" });
    }
});

// List tickets for current user
router.get("/", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ tickets: [] });
        }
        const user = await getOrCreateUser(req.session.userId);
        const tickets = await getTickets(user.id);
        res.json({ tickets });
    } catch (error) {
        console.error("Get tickets error:", error);
        res.status(500).json({ error: "Failed to get tickets" });
    }
});

// Update ticket status
router.put("/:id", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: "No session" });
        }
        const user = await getOrCreateUser(req.session.userId);
        const { status, priority } = req.body;
        await updateTicket(req.params.id, user.id, { status, priority });
        res.json({ success: true });
    } catch (error) {
        console.error("Update ticket error:", error);
        res.status(500).json({ error: "Failed to update ticket" });
    }
});

export default router;
