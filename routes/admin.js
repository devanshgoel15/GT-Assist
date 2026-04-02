import express from "express";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole, attachStaff } from "../middleware/auth.js";
import {
    getAllTickets,
    getTicketsByStaff,
    assignTicket,
    updateTicketStatus,
    updateTicketPriority,
    updateTicketFields,
    addTicketReply,
    getTicketReplies,
    addInternalNote,
    getInternalNotes,
    getAllStaff,
    createStaff,
    deleteStaff,
    getStaffById,
    updateStaffRole,
} from "../db.js";

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);
router.use(attachStaff);

// ========== Tickets ==========

// GET /api/admin/tickets — returns all or assigned-only based on role
router.get("/tickets", async (req, res) => {
    try {
        let tickets;
        if (req.staff.role === "agent") {
            tickets = await getTicketsByStaff(req.staff.id);
        } else {
            tickets = await getAllTickets();
        }
        res.json({ tickets });
    } catch (error) {
        console.error("Admin get tickets error:", error);
        res.status(500).json({ error: "Failed to get tickets" });
    }
});

// PUT /api/admin/tickets/:id/assign — Admin & Team only
router.put("/tickets/:id/assign", requireRole("admin", "team"), async (req, res) => {
    try {
        const { staffId } = req.body;
        if (!staffId) {
            return res.status(400).json({ error: "staffId is required" });
        }
        await assignTicket(req.params.id, staffId);
        res.json({ success: true });
    } catch (error) {
        console.error("Assign ticket error:", error);
        res.status(500).json({ error: "Failed to assign ticket" });
    }
});

// PUT /api/admin/tickets/:id/status — all staff, but agents only their own
router.put("/tickets/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        // Agents can only update their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "You can only update tickets assigned to you" });
            }
        }

        await updateTicketStatus(req.params.id, status);
        res.json({ success: true });
    } catch (error) {
        console.error("Update ticket status error:", error);
        res.status(500).json({ error: "Failed to update ticket status" });
    }
});

// PUT /api/admin/tickets/:id/priority — update ticket priority
router.put("/tickets/:id/priority", async (req, res) => {
    try {
        const { priority } = req.body;
        if (!priority || !["low", "normal", "high"].includes(priority)) {
            return res.status(400).json({ error: "Valid priority is required (low, normal, high)" });
        }

        // Agents can only update their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "You can only update tickets assigned to you" });
            }
        }

        await updateTicketPriority(req.params.id, priority);
        res.json({ success: true });
    } catch (error) {
        console.error("Update ticket priority error:", error);
        res.status(500).json({ error: "Failed to update ticket priority" });
    }
});

// PUT /api/admin/tickets/:id/edit — edit ticket subject/description (Admin & Team only)
router.put("/tickets/:id/edit", requireRole("admin", "team"), async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (!subject && description === undefined) {
            return res.status(400).json({ error: "At least subject or description is required" });
        }
        await updateTicketFields(req.params.id, { subject, description });
        res.json({ success: true });
    } catch (error) {
        console.error("Edit ticket error:", error);
        res.status(500).json({ error: "Failed to edit ticket" });
    }
});

// POST /api/admin/tickets/:id/replies — add reply
router.post("/tickets/:id/replies", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "message is required" });
        }

        // Agents can only reply to their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "You can only reply to tickets assigned to you" });
            }
        }

        const reply = await addTicketReply(req.params.id, req.staff.id, message);
        res.json({ reply });
    } catch (error) {
        console.error("Add reply error:", error);
        res.status(500).json({ error: "Failed to add reply" });
    }
});

// GET /api/admin/tickets/:id/replies — get replies
router.get("/tickets/:id/replies", async (req, res) => {
    try {
        // Agents can only view replies on their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        const replies = await getTicketReplies(req.params.id);
        res.json({ replies });
    } catch (error) {
        console.error("Get replies error:", error);
        res.status(500).json({ error: "Failed to get replies" });
    }
});

// POST /api/admin/tickets/:id/notes — add internal note
router.post("/tickets/:id/notes", async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: "content is required" });
        }

        // Agents can only add notes to their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        const note = await addInternalNote(req.params.id, req.staff.id, content);
        res.json({ note });
    } catch (error) {
        console.error("Add note error:", error);
        res.status(500).json({ error: "Failed to add note" });
    }
});

// GET /api/admin/tickets/:id/notes — get internal notes
router.get("/tickets/:id/notes", async (req, res) => {
    try {
        // Agents can only view notes on their assigned tickets
        if (req.staff.role === "agent") {
            const tickets = await getTicketsByStaff(req.staff.id);
            const ticketIds = tickets.map((t) => t.id);
            if (!ticketIds.includes(parseInt(req.params.id))) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        const notes = await getInternalNotes(req.params.id);
        res.json({ notes });
    } catch (error) {
        console.error("Get notes error:", error);
        res.status(500).json({ error: "Failed to get notes" });
    }
});

// ========== Staff Management (Admin only) ==========

// GET /api/admin/staff
router.get("/staff", async (req, res) => {
    try {
        const staff = await getAllStaff();
        res.json({ staff });
    } catch (error) {
        console.error("Get staff error:", error);
        res.status(500).json({ error: "Failed to get staff" });
    }
});

// POST /api/admin/staff — Admin only
router.post("/staff", requireRole("admin"), async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Email, password, and name are required" });
        }

        const validRoles = ["admin", "team", "agent"];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role. Must be admin, team, or agent" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const staff = await createStaff(email.toLowerCase().trim(), passwordHash, name, role || "agent");
        res.json({ staff });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({ error: "A staff member with this email already exists" });
        }
        console.error("Create staff error:", error);
        res.status(500).json({ error: "Failed to create staff" });
    }
});

// DELETE /api/admin/staff/:id — Admin only
router.delete("/staff/:id", requireRole("admin"), async (req, res) => {
    try {
        // Prevent self-deletion
        if (parseInt(req.params.id) === req.staff.id) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }
        await deleteStaff(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete staff error:", error);
        res.status(500).json({ error: "Failed to delete staff" });
    }
});

// PUT /api/admin/staff/:id/role — change staff role (Admin only)
router.put("/staff/:id/role", requireRole("admin"), async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ["admin", "team", "agent"];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: "Valid role is required (admin, team, agent)" });
        }
        // Prevent changing own role
        if (parseInt(req.params.id) === req.staff.id) {
            return res.status(400).json({ error: "You cannot change your own role" });
        }
        await updateStaffRole(req.params.id, role);
        res.json({ success: true });
    } catch (error) {
        console.error("Update staff role error:", error);
        res.status(500).json({ error: "Failed to update staff role" });
    }
});

export default router;
