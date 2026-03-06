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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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
  // Try to find existing user
  const existing = await pool.query("SELECT * FROM users WHERE session_id = $1", [sessionId]);
  if (existing.rows.length > 0) {
    await pool.query("UPDATE users SET last_seen = NOW() WHERE session_id = $1", [sessionId]);
    return existing.rows[0];
  }

  // Create new user and return it
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

  // Language breakdown
  const langResult = await pool.query("SELECT language, COUNT(*) as count FROM chats GROUP BY language");
  const languageBreakdown = {};
  for (const row of langResult.rows) {
    languageBreakdown[row.language] = parseInt(row.count);
  }

  // Events by type
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
