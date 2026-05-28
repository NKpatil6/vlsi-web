/**
 * Groq AI Proxy — mirrors the original GitHub project's /api/ai endpoint.
 * Key resolution order: process.env.GROQ_API_KEY → user_settings DB (EXE mode)
 */
import sql from "@/app/api/utils/sql";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 60000;

const VALID_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "llama3-70b-8192",
  "gemma2-9b-it",
];

/** Resolve key: env first, then user_settings DB (EXE/desktop mode) */
async function resolveGroqKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const rows =
      await sql`SELECT value FROM user_settings WHERE key = 'groq_api_key' LIMIT 1`;
    if (rows.length > 0 && rows[0].value && rows[0].value.trim())
      return rows[0].value.trim();
  } catch {
    /* ignore */
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, model, messages } = body;

    const GROQ_API_KEY = await resolveGroqKey();
    if (!GROQ_API_KEY) {
      return Response.json(
        {
          success: false,
          error:
            "Groq API key not configured. Add it in Settings → AI Configuration.",
          code: "NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const effectiveModel = VALID_MODELS.includes(model) ? model : DEFAULT_MODEL;

    // Build messages array
    let chatMessages;
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof prompt === "string" && prompt.trim()) {
      chatMessages = [{ role: "user", content: prompt }];
    } else {
      return Response.json(
        { success: false, error: "Either prompt or messages required" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let groqResponse;
    try {
      groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: chatMessages,
          stream: false,
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!groqResponse.ok) {
      const errText = await groqResponse.text().catch(() => "");
      if (groqResponse.status === 429) {
        const retryAfter = groqResponse.headers.get("retry-after");
        return Response.json(
          {
            success: false,
            error: "Rate limited by Groq API",
            code: "RATE_LIMITED",
            retryAfter: parseInt(retryAfter || "30") * 1000,
          },
          { status: 429 },
        );
      }
      if (groqResponse.status === 401) {
        return Response.json(
          {
            success: false,
            error: "Invalid Groq API key — update it in Settings.",
            code: "INVALID_KEY",
          },
          { status: 401 },
        );
      }
      return Response.json(
        {
          success: false,
          error: `Groq API error: ${groqResponse.status}`,
          details: errText,
        },
        { status: 502 },
      );
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return Response.json({
      success: true,
      content,
      model: data?.model || effectiveModel,
      provider: "groq",
      usage: data?.usage || {},
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return Response.json(
        { success: false, error: "Request timed out" },
        { status: 504 },
      );
    }
    console.error("[Groq Proxy]", error);
    return Response.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 },
    );
  }
}
