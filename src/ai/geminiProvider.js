/**
 * Gemini AI Provider
 * Calls Google Generative Language API (gemini-2.0-flash).
 * API key is read from localStorage under vlsi_settings.gemini_api_key.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

export const GEMINI_MODELS = {
  FLASH: "gemini-2.0-flash",
  FLASH_LITE: "gemini-2.0-flash-lite",
  PRO: "gemini-1.5-pro",
};

export const GEMINI_MODEL_DISPLAY_NAMES = {
  [GEMINI_MODELS.FLASH]: "Gemini 2.0 Flash (Google — Free tier)",
  [GEMINI_MODELS.FLASH_LITE]: "Gemini 2.0 Flash Lite (Google — Free tier)",
  [GEMINI_MODELS.PRO]: "Gemini 1.5 Pro (Google)",
};

function getGeminiKey() {
  try {
    const s = JSON.parse(localStorage.getItem("vlsi_settings") || "{}");
    return s.gemini_api_key || null;
  } catch {
    return null;
  }
}

function getGeminiModel() {
  try {
    const s = JSON.parse(localStorage.getItem("vlsi_settings") || "{}");
    return s.preferred_gemini_model || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Send a prompt to Gemini and return { success, content, provider, model }.
 */
export async function requestGemini(prompt, options = {}) {
  const {
    systemPrompt = "",
    maxTokens = 4000,
    temperature = 0.7,
    retries = MAX_RETRIES,
  } = options;

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "Gemini API key not configured. Add it in Settings.",
      content: null,
    };
  }

  const model = options.model || getGeminiModel();
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  // Build contents array — Gemini uses a single user turn with optional system instruction
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt ? `${systemPrompt}\n\nTask: ${prompt}` : prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.status === 429) {
        // Rate limited — wait longer
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 30000));
          continue;
        }
        return { success: false, error: "Gemini rate limited. Try again later.", content: null };
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        return {
          success: false,
          error: `Gemini error ${res.status}: ${errBody.slice(0, 200)}`,
          content: null,
        };
      }

      const data = await res.json();
      const content =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!content) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        return { success: false, error: "Gemini returned empty response", content: null };
      }

      return { success: true, content, provider: "gemini", model };
    } catch (err) {
      if (err.name === "AbortError") {
        return { success: false, error: "Gemini request timed out", content: null };
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      } else {
        return { success: false, error: err.message || "Gemini request failed", content: null };
      }
    }
  }

  return { success: false, error: "Gemini request failed", content: null };
}
