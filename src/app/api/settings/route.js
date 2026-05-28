/**
 * Settings API — persists user preferences to user_settings table.
 * Supports: groq_api_key, questasim_path, preferred_model,
 *           daily_study_goal, session_shift_minutes, sound_alerts
 */
import sql from "@/app/api/utils/sql";

const ALLOWED_KEYS = [
  "groq_api_key",
  "questasim_path",
  "preferred_model",
  "daily_study_goal",
  "session_shift_minutes",
  "sound_alerts",
  "browser_notifications",
];

// GET /api/settings — return all settings as a key→value object
export async function GET() {
  try {
    const rows =
      await sql`SELECT key, value FROM user_settings WHERE key = ANY(${ALLOWED_KEYS})`;
    const result = {};
    rows.forEach((r) => {
      result[r.key] = r.value;
    });
    // Mask Groq API key in response — return only presence indicator
    if (result.groq_api_key) {
      result.groq_api_key_set = "true";
      result.groq_api_key = ""; // never expose the actual key via API
    }
    return Response.json({ success: true, settings: result });
  } catch (err) {
    console.error("[Settings GET]", err);
    return Response.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

// POST /api/settings — upsert one or more settings
export async function POST(request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const updates = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      const strVal =
        value === null || value === undefined ? null : String(value);
      updates.push(
        sql`
          INSERT INTO user_settings (key, value, updated_at)
          VALUES (${key}, ${strVal}, ${now})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
        `,
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Settings POST]", err);
    return Response.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
