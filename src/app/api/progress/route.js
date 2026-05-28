import sql from "@/app/api/utils/sql";

// GET /api/progress - Get all user progress
export async function GET(request) {
  try {
    const progress = await sql`
      SELECT * FROM user_progress
      ORDER BY last_accessed_at DESC NULLS LAST
    `;

    return Response.json({ success: true, progress });
  } catch (error) {
    console.error("[API] Get progress error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}

// POST /api/progress - Update topic progress
export async function POST(request) {
  try {
    const body = await request.json();
    const { topicId, completed, progress, timeSpentMinutes, completedAt } =
      body;

    if (!topicId) {
      return Response.json(
        { success: false, error: "topicId is required" },
        { status: 400 },
      );
    }

    // Check if progress exists
    const existing = await sql`
      SELECT * FROM user_progress WHERE topic_id = ${topicId}
    `;

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing
      const updated = await sql`
        UPDATE user_progress
        SET
          completed = COALESCE(${completed}, completed),
          completed_at = COALESCE(${completedAt}, completed_at),
          progress = COALESCE(${progress}, progress),
          time_spent_minutes = COALESCE(${timeSpentMinutes}, time_spent_minutes),
          last_accessed_at = ${now},
          updated_at = ${now}
        WHERE topic_id = ${topicId}
        RETURNING *
      `;

      return Response.json({ success: true, progress: updated[0] });
    } else {
      // Insert new
      const inserted = await sql`
        INSERT INTO user_progress (
          topic_id,
          completed,
          completed_at,
          progress,
          time_spent_minutes,
          last_accessed_at,
          created_at,
          updated_at
        ) VALUES (
          ${topicId},
          ${completed || false},
          ${completedAt || null},
          ${progress || 0},
          ${timeSpentMinutes || 0},
          ${now},
          ${now},
          ${now}
        )
        RETURNING *
      `;

      return Response.json({ success: true, progress: inserted[0] });
    }
  } catch (error) {
    console.error("[API] Update progress error:", error);
    return Response.json(
      { success: false, error: "Failed to update progress" },
      { status: 500 },
    );
  }
}
