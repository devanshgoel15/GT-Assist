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
  await pool.query(
    "UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2",
    [status, ticketId]
  );
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
