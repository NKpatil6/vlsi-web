import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

// GET /api/sessions - Get all sessions with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    let query = "SELECT * FROM sessions WHERE 1=1";
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND scheduled_date = $${params.length}`;
    }

    query += " ORDER BY scheduled_date DESC, created_at DESC LIMIT 300";
    const sessions = await sql(query, params);

    return Response.json({ success: true, sessions });
  } catch (error) {
    console.error("[API] Get sessions error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}

// POST /api/sessions - Create new session
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      type,
      topicId,
      scheduledDate,
      scheduledTime,
      recurrence = "one-time",
      notes,
    } = body;

    if (!title || !type || !topicId || !scheduledDate) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const validTypes = ["learning", "coding", "revision"];
    const validRecurrences = ["one-time", "daily", "weekly"];
    if (!validTypes.includes(type))
      return Response.json(
        { success: false, error: "Invalid type" },
        { status: 400 },
      );
    if (!validRecurrences.includes(recurrence))
      return Response.json(
        { success: false, error: "Invalid recurrence" },
        { status: 400 },
      );

    const id = randomUUID();
    const now = new Date().toISOString();

    const [session] = await sql`
      INSERT INTO sessions (
        id,
        title,
        type,
        topic_id,
        scheduled_date,
        scheduled_time,
        recurrence,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${title},
        ${type},
        ${topicId},
        ${scheduledDate},
        ${scheduledTime || null},
        ${recurrence},
        'pending',
        ${notes || null},
        ${now},
        ${now}
      )
      RETURNING *
    `;

    return Response.json({ success: true, session });
  } catch (error) {
    console.error("[API] Create session error:", error);
    return Response.json(
      { success: false, error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// PUT /api/sessions - Update session
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      type,
      topicId,
      scheduledDate,
      scheduledTime,
      recurrence,
      status,
      notes,
      durationMinutes,
      completedAt,
    } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "Session ID is required" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const [session] = await sql`
      UPDATE sessions
      SET
        title = COALESCE(${title}, title),
        type = COALESCE(${type}, type),
        topic_id = COALESCE(${topicId}, topic_id),
        scheduled_date = COALESCE(${scheduledDate}, scheduled_date),
        scheduled_time = COALESCE(${scheduledTime}, scheduled_time),
        recurrence = COALESCE(${recurrence}, recurrence),
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes),
        duration_minutes = COALESCE(${durationMinutes}, duration_minutes),
        completed_at = COALESCE(${completedAt}, completed_at),
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (session.length === 0) {
      return Response.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    return Response.json({ success: true, session: session[0] });
  } catch (error) {
    console.error("[API] Update session error:", error);
    return Response.json(
      { success: false, error: "Failed to update session" },
      { status: 500 },
    );
  }
}

// DELETE /api/sessions - Delete session
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { success: false, error: "Session ID is required" },
        { status: 400 },
      );
    }

    await sql`DELETE FROM sessions WHERE id = ${id}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error("[API] Delete session error:", error);
    return Response.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
