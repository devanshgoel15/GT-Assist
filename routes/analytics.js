import express from "express";
import { trackEvent, getAnalyticsSummary, getEnhancedAnalytics, getOrCreateUser } from "../db.js";
import { requireAuth, requireRole, attachStaff } from "../middleware/auth.js";

const router = express.Router();

// Track an event
router.post("/event", async (req, res) => {
    try {
        let userId = null;
        if (req.session.userId) {
            const user = await getOrCreateUser(req.session.userId);
            userId = user.id;
        }
        const { event_type, metadata } = req.body;

        if (!event_type) {
            return res.status(400).json({ error: "event_type is required" });
        }

        await trackEvent(userId, event_type, metadata);
        res.json({ success: true });
    } catch (error) {
        console.error("Track event error:", error);
        res.status(500).json({ error: "Failed to track event" });
    }
});

// Get analytics summary
router.get("/summary", async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        res.json({ summary });
    } catch (error) {
        console.error("Analytics summary error:", error);
        res.status(500).json({ error: "Failed to get analytics" });
    }
});

// Get enhanced analytics (admin/team only)
router.get("/enhanced", requireAuth, attachStaff, requireRole("admin", "team"), async (req, res) => {
    try {
        const analytics = await getEnhancedAnalytics();
        res.json({ analytics });
    } catch (error) {
        console.error("Enhanced analytics error:", error);
        res.status(500).json({ error: "Failed to get enhanced analytics" });
    }
});

export default router;
