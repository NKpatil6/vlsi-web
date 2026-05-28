import sql from "@/app/api/utils/sql";
import { randomUUID } from "crypto";

// GET /api/flashcards - Get flashcards by topic
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");
    const dueOnly = searchParams.get("dueOnly") === "true";

    if (!topicId) {
      return Response.json(
        { success: false, error: "Topic ID is required" },
        { status: 400 },
      );
    }

    let flashcards;
    if (dueOnly) {
      const now = new Date().toISOString();
      flashcards = await sql`
        SELECT * FROM flashcards
        WHERE topic_id = ${topicId}
        AND (next_review IS NULL OR next_review <= ${now})
        ORDER BY next_review ASC NULLS FIRST
      `;
    } else {
      flashcards = await sql`
        SELECT * FROM flashcards
        WHERE topic_id = ${topicId}
        ORDER BY created_at DESC
      `;
    }

    return Response.json({ success: true, flashcards });
  } catch (error) {
    console.error("[API] Get flashcards error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch flashcards" },
      { status: 500 },
    );
  }
}

// POST /api/flashcards - Create flashcards (bulk)
export async function POST(request) {
  try {
    const body = await request.json();
    const { topicId, flashcards } = body;

    if (!topicId || !Array.isArray(flashcards) || flashcards.length === 0) {
      return Response.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const created = [];

    for (const card of flashcards) {
      const id = randomUUID();
      const [inserted] = await sql`
        INSERT INTO flashcards (
          id,
          topic_id,
          front,
          back,
          difficulty,
          ease_factor,
          interval_days,
          repetitions,
          created_at
        ) VALUES (
          ${id},
          ${topicId},
          ${card.front},
          ${card.back},
          ${card.difficulty || "intermediate"},
          2.5,
          0,
          0,
          ${now}
        )
        RETURNING *
      `;
      created.push(inserted);
    }

    return Response.json({ success: true, flashcards: created });
  } catch (error) {
    console.error("[API] Create flashcards error:", error);
    return Response.json(
      { success: false, error: "Failed to create flashcards" },
      { status: 500 },
    );
  }
}

// PUT /api/flashcards/review - Review flashcard (spaced repetition)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { flashcardId, rating } = body;

    if (!flashcardId || !rating || rating < 1 || rating > 5) {
      return Response.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    // Fetch current flashcard state
    const [flashcard] = await sql`
      SELECT * FROM flashcards WHERE id = ${flashcardId}
    `;

    if (!flashcard) {
      return Response.json(
        { success: false, error: "Flashcard not found" },
        { status: 404 },
      );
    }

    // SM-2 algorithm
    let easeFactor = parseFloat(flashcard.ease_factor);
    let interval = flashcard.interval_days;
    let repetitions = flashcard.repetitions;

    if (rating < 3) {
      // Reset
      repetitions = 0;
      interval = 0;
    } else {
      repetitions += 1;

      // Update ease factor
      easeFactor =
        easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;

      // Calculate next interval
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    // Update flashcard
    const [updated] = await sql`
      UPDATE flashcards
      SET
        last_reviewed = ${now.toISOString()},
        next_review = ${nextReview.toISOString()},
        ease_factor = ${easeFactor},
        interval_days = ${interval},
        repetitions = ${repetitions}
      WHERE id = ${flashcardId}
      RETURNING *
    `;

    // Record review
    const reviewId = randomUUID();
    await sql`
      INSERT INTO flashcard_reviews (id, flashcard_id, rating, reviewed_at)
      VALUES (${reviewId}, ${flashcardId}, ${rating}, ${now.toISOString()})
    `;

    // Update analytics
    const today = now.toISOString().split("T")[0];
    await sql`
      INSERT INTO analytics_daily (date, flashcards_reviewed)
      VALUES (${today}, 1)
      ON CONFLICT (date) DO UPDATE
      SET flashcards_reviewed = analytics_daily.flashcards_reviewed + 1
    `;

    return Response.json({ success: true, flashcard: updated });
  } catch (error) {
    console.error("[API] Review flashcard error:", error);
    return Response.json(
      { success: false, error: "Failed to review flashcard" },
      { status: 500 },
    );
  }
}

// DELETE /api/flashcards - Delete flashcard
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { success: false, error: "Flashcard ID is required" },
        { status: 400 },
      );
    }

    await sql`DELETE FROM flashcards WHERE id = ${id}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error("[API] Delete flashcard error:", error);
    return Response.json(
      { success: false, error: "Failed to delete flashcard" },
      { status: 500 },
    );
  }
}
