import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import session from "express-session";
import bcrypt from "bcryptjs";
import { initDB, getOrCreateUser, saveChat, trackEvent, createTicket, getStaffByEmail, createStaff } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "gt-assist-secret-key-2024",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(express.static("public"));

// Import routes
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";
import ticketRoutes from "./routes/tickets.js";
import analyticsRoutes from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import teamchatRoutes from "./routes/teamchat.js";

app.use("/api/user", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teamchat", teamchatRoutes);

// Bytez API config
const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY;
const BYTEZ_API_URL = "https://api.bytez.com/models/v2/openai/gpt-4o";

if (!BYTEZ_API_KEY) {
  console.warn("⚠️  WARNING: BYTEZ_API_KEY is not set in .env — chat will fail!");
} else {
  console.log(`🔑 BYTEZ_API_KEY loaded (length=${BYTEZ_API_KEY.length}, start=${BYTEZ_API_KEY.substring(0, 4)}, end=${BYTEZ_API_KEY.slice(-4)})`);
}

const SYSTEM_PROMPT = `You are GT Assist — the official AI assistant of Germanium Technologies Limited. You are friendly, professional, and bilingual (Hindi & English).

═══════════════════════════════════════
COMPANY KNOWLEDGE BASE
═══════════════════════════════════════

ABOUT GERMANIUM TECHNOLOGIES LIMITED:
- Full Name: Germanium Technologies Limited
- Short Name: GTL / Germanium Technologies
- Founded: March 15, 2000 (Incorporated)
- CIN: U74899DL2000PLC104430
- Parent Group: Dalmia Group (a prominent Indian conglomerate)
- Headquarters: 2nd Floor, 30, Shivaji Marg, Najafgarh Road, New Delhi, Delhi, India - 110015
- Websites: germaniumindia.com, gtlit.com
- Status: Active, Public Limited Company
- Team Size: 567+ employees
- Revenue: ₹34.8 Cr (as of FY 2024-25, with 7% CAGR)
- Authorized Capital: ₹5,00,00,000
- Paid-up Capital: ₹1,64,58,130
- Experience: 20+ years in the IT & BPO industry
- Clients: Trusted by 60+ major corporations across India

SERVICES OFFERED:
1. BPO Services — Call center operations, multimedia contact center, back-office support, data entry, data management
2. IT-Enabled Services (ITeS) — IVRS development, software development, data processing, IT consulting
3. Digital Marketing — SEO, SEM, content marketing, social media strategies
4. Finance & Accounting Services — Outsourced F&A operations
5. Knowledge Management Services — Searchable knowledge bases, live updates, workflow guidance, analytics
6. Consulting Services — Business management consultancy across industries

INDUSTRIES SERVED:
Automotive, FMCG, IT & Technology, Telecommunications, Entertainment & Media, E-Governance, Finance & Insurance

CERTIFICATIONS & STANDARDS:
- ISO 9001:2008 (Quality Management)
- ISO 27001 (Information Security)
- ISO 22301 (Business Continuity)

OPERATIONAL PRESENCE:
Pan-India operations across Delhi, Mumbai, Kolkata, Chennai, Pune, and Noida

LEADERSHIP / DIRECTORS:
- Rajesh Sehgal
- Dinesh Prasad
- Arun Sharma
- Devender Negi

KEY ACHIEVEMENTS:
- Handle millions of CTI (Computer Telephony Integration) calls annually
- 20+ years of consistent service excellence
- Part of the prestigious Dalmia Group

═══════════════════════════════════════
BEHAVIOR RULES
═══════════════════════════════════════

LANGUAGE RULES:
1. If the user writes in Hindi (Devanagari script), reply in Hindi.
2. If the user writes in English, reply in English.
3. If the user writes in Hinglish (Hindi words in Roman/Latin script like "kya kar rahe ho"), reply in English.
4. If the user mixes Hindi (Devanagari) and English, reply in Hindi.
5. Always prioritize English only when there is NO Devanagari script in the input.
6. Never force a language switch unless the user explicitly asks.
7. When replying in Hindi, ALWAYS use feminine gender (स्त्रीलिंग). For example, say "मैं कर सकती हूँ" (not "मैं कर सकता हूँ"), "मैं हूँ आपकी सहायक" (not "सहायक"), "मैं बता सकती हूँ" (not "बता सकता हूँ"). This is because your voice is female.

RESPONSE RULES:
1. Always be professional yet warm and conversational.
2. When asked about Germanium Technologies, use the company knowledge base above to give accurate answers.
3. If asked something about the company that is NOT in your knowledge base, politely say you don't have that specific information and suggest contacting the company directly.
4. You can also help with general queries — knowledge, advice, tech help, etc.
5. Keep responses concise but informative.
6. Do NOT use emojis in your responses unless the user specifically asks for them.
7. When introducing yourself, mention you are GT Assist by Germanium Technologies Limited.
8. If someone asks "What does GT stand for?", answer: "GT stands for Germanium Technologies."
9. Be proud of the company's 20+ years of excellence and Dalmia Group heritage.

TICKET RULES:
1. If the user says something like "I want to raise a ticket", "create a ticket", "I have a complaint", "I need help with an issue", or similar — help them create a support ticket.
2. Ask for a short subject/title and a description of the issue.
3. Once you have both, respond with EXACTLY this JSON format on a NEW LINE at the end of your message:
   [TICKET]{"subject":"<subject>","description":"<description>","priority":"<normal|high|urgent>"}[/TICKET]
4. Always include a friendly confirmation message before the ticket JSON.
5. Do NOT create a ticket unless the user explicitly asks for one.`;

// Helper: retry with exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit =
        error.message?.includes("429") ||
        error.message?.includes("quota") ||
        error.message?.includes("rate") ||
        error.status === 429;

      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`⏳ Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}

// Helper: detect language
function detectLanguage(text) {
  const hindiPattern = /[\u0900-\u097F]/g;
  const matches = text.match(hindiPattern);
  if (!matches) return "en";
  const ratio = matches.length / text.replace(/\s/g, "").length;
  return ratio > 0.3 ? "hi" : "en";
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Enforce message length limit
    if (message.length > 4000) {
      return res.status(400).json({ error: "Message too long. Maximum 4000 characters." });
    }

    // Ensure session user exists
    if (!req.session.userId) {
      req.session.userId = req.sessionID;
    }
    const user = await getOrCreateUser(req.session.userId);
    const msgLang = detectLanguage(message);

    // Save user message to DB
    await saveChat(user.id, "user", message, msgLang);
    await trackEvent(user.id, "message_sent", { language: msgLang });

    // Build messages array for GPT-4o
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (capped to last 20 messages to avoid token limits)
    if (history && history.length > 0) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    const startTime = Date.now();

    const reply = await callWithRetry(async () => {
      const response = await fetch(BYTEZ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": BYTEZ_API_KEY,
        },
        body: JSON.stringify({
          messages: messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const err = new Error(`API error ${response.status}: ${errorBody}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract reply from response
      if (data.output?.choices?.[0]?.message?.content) {
        return data.output.choices[0].message.content;
      } else if (data.output?.message?.content) {
        return data.output.message.content;
      } else if (data.output?.content) {
        return data.output.content;
      } else if (typeof data.output === "string") {
        return data.output;
      } else {
        return JSON.stringify(data.output || data);
      }
    });

    const responseTime = Date.now() - startTime;
    const replyLang = detectLanguage(reply);

    // Save assistant reply to DB
    await saveChat(user.id, "assistant", reply, replyLang);
    await trackEvent(user.id, "message_received", { language: replyLang, response_time_ms: responseTime });

    // Check if the reply contains a ticket creation tag
    let ticketCreated = null;
    const ticketMatch = reply.match(/\[TICKET\](.*?)\[\/TICKET\]/);
    if (ticketMatch) {
      try {
        const ticketData = JSON.parse(ticketMatch[1]);
        ticketCreated = await createTicket(
          user.id,
          ticketData.subject,
          ticketData.description,
          ticketData.priority || "normal"
        );
        await trackEvent(user.id, "ticket_created", { ticket_id: ticketCreated.id });
      } catch (e) {
        console.error("Failed to parse ticket from reply:", e);
      }
    }

    // Clean the reply — remove the ticket JSON tag for display
    const cleanReply = reply.replace(/\[TICKET\].*?\[\/TICKET\]/, "").trim();

    res.json({ reply: cleanReply, ticket: ticketCreated });
  } catch (error) {
    console.error("Bytez API Error:", error.message);
    console.error("Full error:", error.toString());

    if (error.status === 401 || error.message?.includes("unauthorized") || error.message?.includes("API key")) {
      return res.status(401).json({
        error: "Invalid API key. Please check your BYTEZ_API_KEY in .env",
        detail: error.message,
      });
    }
    if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("rate")) {
      return res.status(429).json({
        error: "API rate limit reached. Please wait and try again.",
      });
    }

    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// Seed default admin account
async function seedAdmin() {
  const existing = await getStaffByEmail("admin@gtl.com");
  if (!existing) {
    const hash = await bcrypt.hash("admin123", 10);
    await createStaff("admin@gtl.com", hash, "Admin", "admin");
    console.log("👑 Default admin created: admin@gtl.com / admin123");
  }
}

// Initialize DB then start server
initDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`🤖 GT Assist server running at http://localhost:${PORT}`);
    console.log(`📡 Using Bytez API with GPT-4o model`);
    console.log(`📦 PostgreSQL database ready`);
    console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin.html`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
