import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      topicId,
      title,
      description,
      difficulty,
      starterCode,
      solution,
      userCode,
      timeSpentSeconds,
    } = body;

    if (!topicId || !title || !userCode) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const problemId = randomUUID();
    const solutionId = randomUUID();

    // Insert problem record
    await sql`
      INSERT INTO coding_problems (id, topic_id, title, description, difficulty, starter_code, solution, created_at)
      VALUES (${problemId}, ${topicId}, ${title}, ${description || ""}, ${difficulty || "intermediate"}, ${starterCode || ""}, ${solution || ""}, ${now})
    `;

    // Insert user solution
    const [saved] = await sql`
      INSERT INTO coding_solutions (id, problem_id, code, passed, time_spent_seconds, submitted_at)
      VALUES (${solutionId}, ${problemId}, ${userCode}, false, ${timeSpentSeconds || 0}, ${now})
      RETURNING *
    `;

    // Update analytics
    const today = now.split("T")[0];
    await sql`
      INSERT INTO analytics_daily (date, coding_problems)
      VALUES (${today}, 1)
      ON CONFLICT (date) DO UPDATE
      SET coding_problems = analytics_daily.coding_problems + 1
    `;

    return Response.json({ success: true, solution: saved });
  } catch (error) {
    console.error("[Coding POST]", error);
    return Response.json(
      { success: false, error: "Failed to save coding solution" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    let solutions;
    if (topicId) {
      solutions = await sql`
        SELECT cs.*, cp.title, cp.difficulty, cp.topic_id
        FROM coding_solutions cs
        JOIN coding_problems cp ON cs.problem_id = cp.id
        WHERE cp.topic_id = ${topicId}
        ORDER BY cs.submitted_at DESC
        LIMIT 20
      `;
    } else {
      solutions = await sql`
        SELECT cs.*, cp.title, cp.difficulty, cp.topic_id
        FROM coding_solutions cs
        JOIN coding_problems cp ON cs.problem_id = cp.id
        ORDER BY cs.submitted_at DESC
        LIMIT 50
      `;
    }

    return Response.json({ success: true, solutions });
  } catch (error) {
    console.error("[Coding GET]", error);
    return Response.json(
      { success: false, error: "Failed to fetch solutions" },
      { status: 500 },
    );
  }
}
