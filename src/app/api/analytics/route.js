import sql from "@/app/api/utils/sql";

// GET /api/analytics - Get analytics data for date range
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const days = parseInt(searchParams.get("days") || "90", 10);

    let analytics;

    if (startDate && endDate) {
      analytics = await sql`
        SELECT * FROM analytics_daily
        WHERE date BETWEEN ${startDate} AND ${endDate}
        ORDER BY date DESC
      `;
    } else {
      // Get last N days
      analytics = await sql`
        SELECT * FROM analytics_daily
        ORDER BY date DESC
        LIMIT ${days}
      `;
    }

    return Response.json({ success: true, analytics });
  } catch (error) {
    console.error("[API] Get analytics error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

// POST /api/analytics - Update daily analytics
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      date,
      studyMinutes = 0,
      sessionsCompleted = 0,
      quizzesCompleted = 0,
      flashcardsReviewed = 0,
      codingProblems = 0,
    } = body;

    if (!date) {
      return Response.json(
        { success: false, error: "Date is required" },
        { status: 400 },
      );
    }

    // Upsert analytics
    const result = await sql`
      INSERT INTO analytics_daily (
        date,
        study_minutes,
        sessions_completed,
        quizzes_completed,
        flashcards_reviewed,
        coding_problems
      ) VALUES (
        ${date},
        ${studyMinutes},
        ${sessionsCompleted},
        ${quizzesCompleted},
        ${flashcardsReviewed},
        ${codingProblems}
      )
      ON CONFLICT (date) DO UPDATE
      SET
        study_minutes = analytics_daily.study_minutes + ${studyMinutes},
        sessions_completed = analytics_daily.sessions_completed + ${sessionsCompleted},
        quizzes_completed = analytics_daily.quizzes_completed + ${quizzesCompleted},
        flashcards_reviewed = analytics_daily.flashcards_reviewed + ${flashcardsReviewed},
        coding_problems = analytics_daily.coding_problems + ${codingProblems}
      RETURNING *
    `;

    return Response.json({ success: true, analytics: result[0] });
  } catch (error) {
    console.error("[API] Update analytics error:", error);
    return Response.json(
      { success: false, error: "Failed to update analytics" },
      { status: 500 },
    );
  }
}

// GET /api/analytics/summary - Get summary statistics
export async function GET_SUMMARY(request) {
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

    const [currentStreak] = await sql`
      WITH RECURSIVE streak AS (
        SELECT 
          date,
          study_minutes,
          1 as streak_length
        FROM analytics_daily
        WHERE date = CURRENT_DATE AND study_minutes > 0
        
        UNION ALL
        
        SELECT 
          ad.date,
          ad.study_minutes,
          s.streak_length + 1
        FROM analytics_daily ad
        INNER JOIN streak s ON ad.date = s.date - INTERVAL '1 day'
        WHERE ad.study_minutes > 0
      )
      SELECT COALESCE(MAX(streak_length), 0) as current_streak
      FROM streak
    `;

    const [topicsCompleted] = await sql`
      SELECT COUNT(*) as count
      FROM user_progress
      WHERE completed = true
    `;

    return Response.json({
      success: true,
      summary: {
        totalStudyMinutes: parseInt(totalStats.total_study_minutes, 10),
        totalSessions: parseInt(totalStats.total_sessions, 10),
        totalQuizzes: parseInt(totalStats.total_quizzes, 10),
        totalFlashcards: parseInt(totalStats.total_flashcards, 10),
        totalCoding: parseInt(totalStats.total_coding, 10),
        currentStreak: parseInt(currentStreak.current_streak, 10),
        topicsCompleted: parseInt(topicsCompleted.count, 10),
      },
    });
  } catch (error) {
    console.error("[API] Get summary error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch summary" },
      { status: 500 },
    );
  }
}
