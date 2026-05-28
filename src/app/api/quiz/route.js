import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

// POST /api/quiz/submit - Submit quiz attempt
export async function POST(request) {
  try {
    const body = await request.json();
    const { topicId, questions, answers, timeSpentSeconds } = body;

    if (!topicId || !questions || !answers) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Calculate score
    const correctAnswers = questions.filter(
      (q, i) => q.correctAnswer === answers[i],
    ).length;
    const score = Math.round((correctAnswers / questions.length) * 100);

    const id = randomUUID();
    const now = new Date().toISOString();

    const attempt = await sql`
      INSERT INTO quiz_attempts (
        id,
        topic_id,
        score,
        total_questions,
        correct_answers,
        time_spent_seconds,
        completed_at
      ) VALUES (
        ${id},
        ${topicId},
        ${score},
        ${questions.length},
        ${correctAnswers},
        ${timeSpentSeconds || 0},
        ${now}
      )
      RETURNING *
    `;

    // Update analytics
    const today = new Date().toISOString().split("T")[0];
    await sql`
      INSERT INTO analytics_daily (date, quizzes_completed)
      VALUES (${today}, 1)
      ON CONFLICT (date) DO UPDATE
      SET quizzes_completed = analytics_daily.quizzes_completed + 1
    `;

    return Response.json({
      success: true,
      attempt: attempt[0],
      score,
      correctAnswers,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("[API] Submit quiz error:", error);
    return Response.json(
      { success: false, error: "Failed to submit quiz" },
      { status: 500 },
    );
  }
}

// GET /api/quiz/history - Get quiz history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let attempts;
    if (topicId) {
      attempts = await sql`
        SELECT * FROM quiz_attempts
        WHERE topic_id = ${topicId}
        ORDER BY completed_at DESC
        LIMIT ${limit}
      `;
    } else {
      attempts = await sql`
        SELECT * FROM quiz_attempts
        ORDER BY completed_at DESC
        LIMIT ${limit}
      `;
    }

    return Response.json({ success: true, attempts });
  } catch (error) {
    console.error("[API] Get quiz history error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch quiz history" },
      { status: 500 },
    );
  }
}
