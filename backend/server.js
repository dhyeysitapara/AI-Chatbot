import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─── API Keys (server-side only, never sent to the browser) ───────────────────
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Structured Prompt Template ───────────────────────────────────────────────
// A hidden system prompt that shapes how ThinkBot responds to every request.
const SYSTEM_PROMPT = `You are ThinkBot, an intelligent and helpful AI conversational assistant.

Your behavior guidelines:
- Be concise, clear, and helpful.
- Remember and reference earlier parts of the conversation when relevant.
- When writing code, always use proper code blocks with the language specified.
- Format responses with Markdown: use bullet points, headings, and bold text to improve readability.
- If the user asks a follow-up question, relate it back to the previous context naturally.
- Stay friendly, professional, and context-aware at all times.`;

// ─── POST /api/chat ───────────────────────────────────────────────────────────
// Accepts:  { userMessage: string, conversationHistory: Array<{role, parts}> }
// Returns:  { reply: string }
app.post("/api/chat", async (req, res) => {
  const { userMessage, conversationHistory = [] } = req.body;

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return res.status(400).json({ error: "userMessage is required." });
  }

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: "No API keys configured on the server." });
  }

  // Build the multi-turn conversation payload for Gemini.
  // We inject the system prompt as the very first "model" message (a common
  // pattern for Gemini 1.5 which doesn't have a dedicated system-instruction
  // field in the v1beta REST API).
  const systemTurn = {
    role: "user",
    parts: [{ text: SYSTEM_PROMPT }],
  };
  const systemAck = {
    role: "model",
    parts: [{ text: "Understood. I am ThinkBot, ready to help." }],
  };

  // conversationHistory comes in as [{role, parts},...] from the frontend.
  // We prefix with the system prompt exchange, then append the new user message.
  const contents = [
    systemTurn,
    systemAck,
    ...conversationHistory,
    { role: "user", parts: [{ text: userMessage.trim() }] },
  ];

  const payload = { contents };

  // ── Key rotation: try each API key in order ──────────────────────────────
  let lastError = null;

  for (const key of API_KEYS) {
    try {
      const url = `${GEMINI_BASE_URL}?key=${key}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[ThinkBot] Key failed (${response.status}):`, errBody);
        lastError = `Gemini API error: ${response.status}`;
        continue; // try next key
      }

      const data = await response.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini.";

      return res.json({ reply });
    } catch (err) {
      if (err.name === "AbortError") {
        lastError = "Request timed out.";
      } else {
        lastError = err.message || "Unknown error.";
      }
      console.warn("[ThinkBot] Fetch error:", lastError);
      continue; // try next key
    }
  }

  // All keys exhausted
  console.error("[ThinkBot] All API keys failed. Last error:", lastError);
  return res.status(502).json({ error: lastError || "All API keys failed or were exhausted." });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", model: GEMINI_MODEL }));

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ ThinkBot backend running on http://localhost:${PORT}`);
  console.log(`   Loaded ${API_KEYS.length} API key(s).`);
});
