import { getStaffById } from "../db.js";

// Middleware: require staff authentication
export function requireAuth(req, res, next) {
    if (!req.session.staffId) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}

// Middleware: require specific role(s)
export function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        if (!req.session.staffId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const staff = await getStaffById(req.session.staffId);
        if (!staff) {
            return res.status(401).json({ error: "Staff account not found" });
        }

        if (!allowedRoles.includes(staff.role)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        req.staff = staff;
        next();
    };
}

// Middleware: attach staff info to request
export async function attachStaff(req, res, next) {
    if (req.session.staffId) {
        const staff = await getStaffById(req.session.staffId);
        if (staff) {
            req.staff = staff;
        }
    }
    next();
}
