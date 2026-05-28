import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

// GET /api/sessions/backlog
export async function GET() {
  try {
    const items = await sql`
      SELECT * FROM backlog_sessions
      WHERE resolved = false
      ORDER BY original_date ASC, added_at ASC
    `;
    return Response.json({ success: true, backlog: items });
  } catch (error) {
    console.error("[Backlog GET]", error);
    return Response.json(
      { success: false, error: "Failed to fetch backlog" },
      { status: 500 },
    );
  }
}

// POST /api/sessions/backlog — add to backlog
export async function POST(request) {
  try {
    const body = await request.json();
    const { originalSessionId, topicId, originalDate, type, title, notes } =
      body;
    if (!topicId || !originalDate || !type || !title) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const [item] = await sql`
      INSERT INTO backlog_sessions (id, original_session_id, topic_id, original_date, type, title, notes, added_at)
      VALUES (${id}, ${originalSessionId || null}, ${topicId}, ${originalDate}, ${type}, ${title}, ${notes || null}, NOW())
      RETURNING *
    `;
    return Response.json({ success: true, item });
  } catch (error) {
    console.error("[Backlog POST]", error);
    return Response.json(
      { success: false, error: "Failed to add to backlog" },
      { status: 500 },
    );
  }
}

// PUT /api/sessions/backlog — reschedule or resolve
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, rescheduledDate, resolved } = body;
    if (!id)
      return Response.json(
        { success: false, error: "id required" },
        { status: 400 },
      );

    let result;
    if (resolved) {
      [result] = await sql`
        UPDATE backlog_sessions
        SET resolved = true, resolved_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (rescheduledDate) {
      [result] = await sql`
        UPDATE backlog_sessions
        SET rescheduled_date = ${rescheduledDate}
        WHERE id = ${id}
        RETURNING *
      `;
    }
    return Response.json({ success: true, item: result });
  } catch (error) {
    console.error("[Backlog PUT]", error);
    return Response.json(
      { success: false, error: "Failed to update backlog" },
      { status: 500 },
    );
  }
}

// DELETE /api/sessions/backlog?id=xxx
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return Response.json(
        { success: false, error: "id required" },
        { status: 400 },
      );

    await sql`DELETE FROM backlog_sessions WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("[Backlog DELETE]", error);
    return Response.json(
      { success: false, error: "Failed to delete backlog item" },
      { status: 500 },
    );
  }
}
