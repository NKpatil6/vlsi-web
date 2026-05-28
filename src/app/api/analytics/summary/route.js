import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const [totalStats] = await sql`
      SELECT
        COALESCE(SUM(study_minutes), 0) as total_study_minutes,
        COALESCE(SUM(sessions_completed), 0) as total_sessions,
        COALESCE(SUM(quizzes_completed), 0) as total_quizzes,
        COALESCE(SUM(flashcards_reviewed), 0) as total_flashcards,
        COALESCE(SUM(coding_problems), 0) as total_coding
      FROM analytics_daily
    `;

    const [topicsCompleted] = await sql`
      SELECT COUNT(*) as count FROM user_progress WHERE completed = true
    `;

    // Streak calculation: count consecutive days from today going backward
    const streakRows = await sql`
      SELECT date FROM analytics_daily
      WHERE study_minutes > 0
      ORDER BY date DESC
      LIMIT 365
    `;

    let currentStreak = 0;
    if (streakRows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < streakRows.length; i++) {
        const rowDate = new Date(streakRows[i].date);
        rowDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (rowDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalStudyMinutes: parseInt(totalStats.total_study_minutes, 10),
        totalSessions: parseInt(totalStats.total_sessions, 10),
        totalQuizzes: parseInt(totalStats.total_quizzes, 10),
        totalFlashcards: parseInt(totalStats.total_flashcards, 10),
        totalCoding: parseInt(totalStats.total_coding, 10),
        currentStreak,
        topicsCompleted: parseInt(topicsCompleted.count, 10),
      },
    });
  } catch (error) {
    console.error("[Analytics Summary]", error);
    return Response.json(
      { success: false, error: "Failed to fetch summary" },
      { status: 500 },
    );
  }
}
