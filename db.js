import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Initialize database — create tables
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT 'Guest',
      language_pref TEXT DEFAULT 'en',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Staff table for RBAC
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      assigned_to INTEGER REFERENCES staff(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add assigned_to column if it doesn't exist (for existing databases)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES staff(id);
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      event_type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Internal notes table (visible only to staff, not customers)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS internal_notes (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add resolved_at column for avg resolution time tracking
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  // Migrate existing priorities to the new exactly 3 levels
  await pool.query(`
    UPDATE tickets SET priority = 'normal' WHERE priority = 'medium';
    UPDATE tickets SET priority = 'high' WHERE priority = 'urgent';
  `);

  // Team chat messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_messages (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("📦 Database initialized (PostgreSQL — Neon)");
}

// ========== User Operations ==========

export async function getOrCreateUser(sessionId) {
  const existing = await pool.query("SELECT * FROM users WHERE session_id = $1", [sessionId]);
  if (existing.rows.length > 0) {
    await pool.query("UPDATE users SET last_seen = NOW() WHERE session_id = $1", [sessionId]);
    return existing.rows[0];
  }

  const result = await pool.query(
    "INSERT INTO users (session_id) VALUES ($1) RETURNING *",
    [sessionId]
  );
  return result.rows[0];
}

export async function updateUser(sessionId, updates) {
  const { name, language_pref } = updates;
  if (name) {
    await pool.query("UPDATE users SET name = $1 WHERE session_id = $2", [name, sessionId]);
  }
  if (language_pref) {
    await pool.query("UPDATE users SET language_pref = $1 WHERE session_id = $2", [language_pref, sessionId]);
  }
  const result = await pool.query("SELECT * FROM users WHERE session_id = $1", [sessionId]);
  return result.rows[0];
}

// ========== Chat Operations ==========

export async function saveChat(userId, role, content, language = "en") {
  await pool.query(
    "INSERT INTO chats (user_id, role, content, language) VALUES ($1, $2, $3, $4)",
    [userId, role, content, language]
  );
}

export async function getChatHistory(userId, limit = 50) {
  const result = await pool.query(
    "SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2",
    [userId, limit]
  );
  return result.rows;
}

export async function clearChatHistory(userId) {
  await pool.query("DELETE FROM chats WHERE user_id = $1", [userId]);
}

// ========== Ticket Operations ==========

export async function createTicket(userId, subject, description, priority = "normal") {
  const result = await pool.query(
    "INSERT INTO tickets (user_id, subject, description, priority) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, subject, description, priority]
  );
  return result.rows[0];
}

export async function getTickets(userId) {
  const result = await pool.query(
    "SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function updateTicket(ticketId, userId, updates) {
  const { status, priority } = updates;
  if (status) {
    await pool.query(
      "UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
      [status, ticketId, userId]
    );
  }
  if (priority) {
    await pool.query(
      "UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
      [priority, ticketId, userId]
    );
  }
}

// ========== Staff Operations (RBAC) ==========

export async function createStaff(email, passwordHash, name, role = "agent") {
  const result = await pool.query(
    "INSERT INTO staff (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at",
    [email, passwordHash, name, role]
  );
  return result.rows[0];
}

export async function getStaffByEmail(email) {
  const result = await pool.query("SELECT * FROM staff WHERE email = $1", [email]);
  return result.rows[0] || null;
}

export async function getStaffById(id) {
  const result = await pool.query("SELECT id, email, name, role, created_at FROM staff WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function getAllStaff() {
  const result = await pool.query("SELECT id, email, name, role, created_at FROM staff ORDER BY created_at DESC");
  return result.rows;
}

export async function deleteStaff(id) {
  await pool.query("DELETE FROM staff WHERE id = $1", [id]);
}

// ========== Admin Ticket Operations ==========

export async function getAllTickets() {
  const result = await pool.query(`
    SELECT t.*, u.name as user_name, u.session_id as user_session,
           s.name as assigned_to_name
    FROM tickets t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN staff s ON t.assigned_to = s.id
    ORDER BY t.created_at DESC
  `);
  return result.rows;
}

export async function getTicketsByStaff(staffId) {
  const result = await pool.query(`
    SELECT t.*, u.name as user_name, u.session_id as user_session,
           s.name as assigned_to_name
    FROM tickets t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN staff s ON t.assigned_to = s.id
    WHERE t.assigned_to = $1
    ORDER BY t.created_at DESC
  `, [staffId]);
  return result.rows;
}

export async function assignTicket(ticketId, staffId) {
  await pool.query(
    "UPDATE tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2",
    [staffId, ticketId]
  );
}

export async function updateTicketStatus(ticketId, status) {
  // If resolving, set resolved_at; if reopening, clear it
  if (status === 'resolved' || status === 'closed') {
    await pool.query(
      "UPDATE tickets SET status = $1, updated_at = NOW(), resolved_at = COALESCE(resolved_at, NOW()) WHERE id = $2",
      [status, ticketId]
    );
  } else {
    await pool.query(
      "UPDATE tickets SET status = $1, updated_at = NOW(), resolved_at = NULL WHERE id = $2",
      [status, ticketId]
    );
  }
}

export async function addTicketReply(ticketId, staffId, message) {
  const result = await pool.query(
    "INSERT INTO ticket_replies (ticket_id, staff_id, message) VALUES ($1, $2, $3) RETURNING *",
    [ticketId, staffId, message]
  );
  return result.rows[0];
}

export async function getTicketReplies(ticketId) {
  const result = await pool.query(`
    SELECT tr.*, s.name as staff_name, s.role as staff_role
    FROM ticket_replies tr
    LEFT JOIN staff s ON tr.staff_id = s.id
    WHERE tr.ticket_id = $1
    ORDER BY tr.created_at ASC
  `, [ticketId]);
  return result.rows;
}

// ========== Internal Notes Operations ==========

export async function addInternalNote(ticketId, staffId, content) {
  const result = await pool.query(
    "INSERT INTO internal_notes (ticket_id, staff_id, content) VALUES ($1, $2, $3) RETURNING *",
    [ticketId, staffId, content]
  );
  return result.rows[0];
}

export async function getInternalNotes(ticketId) {
  const result = await pool.query(`
    SELECT n.*, s.name as staff_name, s.role as staff_role
    FROM internal_notes n
    LEFT JOIN staff s ON n.staff_id = s.id
    WHERE n.ticket_id = $1
    ORDER BY n.created_at ASC
  `, [ticketId]);
  return result.rows;
}

// ========== Extended Ticket Operations ==========

export async function updateTicketPriority(ticketId, priority) {
  await pool.query(
    "UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2",
    [priority, ticketId]
  );
}

export async function updateTicketFields(ticketId, fields) {
  const { subject, description } = fields;
  const updates = [];
  const values = [];
  let idx = 1;

  if (subject !== undefined) {
    updates.push(`subject = $${idx++}`);
    values.push(subject);
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(description);
  }
  if (updates.length === 0) return;

  updates.push(`updated_at = NOW()`);
  values.push(ticketId);
  await pool.query(
    `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  );
}

// ========== Staff Role Update ==========

export async function updateStaffRole(staffId, role) {
  await pool.query(
    "UPDATE staff SET role = $1 WHERE id = $2",
    [role, staffId]
  );
}

// ========== Analytics Operations ==========

export async function trackEvent(userId, eventType, metadata = null) {
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  await pool.query(
    "INSERT INTO analytics (user_id, event_type, metadata) VALUES ($1, $2, $3)",
    [userId, eventType, metaStr]
  );
}

export async function getAnalyticsSummary() {
  const totalMessages = (await pool.query("SELECT COUNT(*) as count FROM chats")).rows[0].count;
  const totalUsers = (await pool.query("SELECT COUNT(*) as count FROM users")).rows[0].count;
  const totalTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets")).rows[0].count;
  const openTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'")).rows[0].count;

  const langResult = await pool.query("SELECT language, COUNT(*) as count FROM chats GROUP BY language");
  const languageBreakdown = {};
  for (const row of langResult.rows) {
    languageBreakdown[row.language] = parseInt(row.count);
  }

  const eventsResult = await pool.query("SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type");
  const eventBreakdown = {};
  for (const row of eventsResult.rows) {
    eventBreakdown[row.event_type] = parseInt(row.count);
  }

  return {
    totalMessages: parseInt(totalMessages),
    totalUsers: parseInt(totalUsers),
    totalTickets: parseInt(totalTickets),
    openTickets: parseInt(openTickets),
    languageBreakdown,
    eventBreakdown,
  };
}

export async function getEnhancedAnalytics() {
  const totalTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets")).rows[0].count;
  const openTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'")).rows[0].count;
  const inProgressTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'in_progress'")).rows[0].count;
  const resolvedTickets = (await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved' OR status = 'closed'")).rows[0].count;

  // Tickets per agent
  const perAgent = await pool.query(`
    SELECT s.id, s.name, s.role,
      COUNT(t.id) as total_tickets,
      COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_tickets,
      COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
      COUNT(CASE WHEN t.status = 'resolved' OR t.status = 'closed' THEN 1 END) as resolved_tickets
    FROM staff s
    LEFT JOIN tickets t ON t.assigned_to = s.id
    WHERE s.role IN ('agent', 'team')
    GROUP BY s.id, s.name, s.role
    ORDER BY total_tickets DESC
  `);

  // Average resolution time (in hours)
  const avgTimeResult = await pool.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
    FROM tickets
    WHERE resolved_at IS NOT NULL
  `);
  const avgResolutionHours = avgTimeResult.rows[0].avg_hours
    ? parseFloat(avgTimeResult.rows[0].avg_hours).toFixed(1)
    : null;

  // Tickets by priority
  const byPriority = await pool.query(`
    SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority
  `);
  const priorityBreakdown = {};
  for (const row of byPriority.rows) {
    priorityBreakdown[row.priority] = parseInt(row.count);
  }

  // Unassigned tickets
  const unassigned = (await pool.query("SELECT COUNT(*) as count FROM tickets WHERE assigned_to IS NULL")).rows[0].count;

  return {
    totalTickets: parseInt(totalTickets),
    openTickets: parseInt(openTickets),
    inProgressTickets: parseInt(inProgressTickets),
    resolvedTickets: parseInt(resolvedTickets),
    unassignedTickets: parseInt(unassigned),
    avgResolutionHours,
    perAgent: perAgent.rows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      totalTickets: parseInt(r.total_tickets),
      openTickets: parseInt(r.open_tickets),
      inProgressTickets: parseInt(r.in_progress_tickets),
      resolvedTickets: parseInt(r.resolved_tickets),
    })),
    priorityBreakdown,
  };
}

// ========== Team Chat Operations ==========

export async function sendTeamMessage(staffId, content) {
  const result = await pool.query(
    "INSERT INTO team_messages (staff_id, content) VALUES ($1, $2) RETURNING *",
    [staffId, content]
  );
  return result.rows[0];
}

export async function getTeamMessages(limit = 100) {
  const result = await pool.query(`
    SELECT m.*, s.name as staff_name, s.role as staff_role
    FROM team_messages m
    LEFT JOIN staff s ON m.staff_id = s.id
    ORDER BY m.created_at ASC
    LIMIT $1
  `, [limit]);
  return result.rows;
}
