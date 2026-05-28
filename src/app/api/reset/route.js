import sql from "@/app/api/utils/sql";

// POST /api/reset - Reset all user progress (DANGER ZONE)
export async function POST(request) {
  try {
    const body = await request.json();
    const { confirm } = body;

    if (confirm !== "RESET_ALL_DATA") {
      return Response.json(
        { success: false, error: "Invalid confirmation" },
        { status: 400 },
      );
    }

    // Delete all user data
    await sql`DELETE FROM flashcard_reviews`;
    await sql`DELETE FROM flashcards`;
    await sql`DELETE FROM coding_solutions`;
    await sql`DELETE FROM coding_problems`;
    await sql`DELETE FROM quiz_attempts`;
    await sql`DELETE FROM sessions`;
    await sql`DELETE FROM user_progress`;
    await sql`DELETE FROM analytics_daily`;

    // Reset achievements
    await sql`
      UPDATE achievements
      SET
        unlocked_at = NULL,
        progress = 0
    `;

    return Response.json({
      success: true,
      message: "All progress has been reset",
    });
  } catch (error) {
    console.error("[API] Reset error:", error);
    return Response.json(
      { success: false, error: "Failed to reset progress" },
      { status: 500 },
    );
  }
}
