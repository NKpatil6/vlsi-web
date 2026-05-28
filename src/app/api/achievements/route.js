import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const achievements = await sql`
      SELECT * FROM achievements ORDER BY unlocked_at DESC NULLS LAST, category, threshold ASC
    `;
    return Response.json({ success: true, achievements });
  } catch (error) {
    console.error("[Achievements GET]", error);
    return Response.json(
      { success: false, error: "Failed to fetch achievements" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, progress, unlocked } = body;
    if (!id)
      return Response.json(
        { success: false, error: "id required" },
        { status: 400 },
      );

    const now = new Date().toISOString();
    let result;

    if (unlocked) {
      [result] = await sql`
        UPDATE achievements
        SET unlocked_at = COALESCE(unlocked_at, ${now}), progress = 100
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (progress !== undefined) {
      [result] = await sql`
        UPDATE achievements SET progress = ${Math.min(100, Math.max(0, progress))} WHERE id = ${id} RETURNING *
      `;
    }

    return Response.json({ success: true, achievement: result });
  } catch (error) {
    console.error("[Achievements PUT]", error);
    return Response.json(
      { success: false, error: "Failed to update achievement" },
      { status: 500 },
    );
  }
}
