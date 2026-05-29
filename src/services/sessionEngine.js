/**
 * Session Engine — auto-progression, missed→backlog, AI-monitored completion
 * Mirrors the original GitHub project's sessionEngine + schedulingEngine logic.
 */

import { TOPICS, getTopicsByTrack, isTopicUnlocked } from "@/data/syllabusData";

// ─── DAILY TOPIC PROGRESSION ─────────────────────────────────────────────────

/**
 * Compute the next learning topic based on completed topics.
 * Order follows syllabus order: Design track first (1-14), then Verification (15-20).
 * @param {string[]} completedTopicIds
 * @returns {object|null} next topic
 */
export function getNextLearningTopic(completedTopicIds = []) {
  const allTopics = [
    ...getTopicsByTrack("design"),
    ...getTopicsByTrack("verification"),
  ];

  for (const topic of allTopics) {
    if (completedTopicIds.includes(topic.id)) continue;
    if (isTopicUnlocked(topic.id, completedTopicIds)) {
      return topic;
    }
  }
  return null; // All topics complete
}

/**
 * Given a date offset from today, what topic should be scheduled?
 * day 0 = today's topic, day 1 = tomorrow, etc.
 * @param {string[]} completedTopicIds
 * @param {string[]} scheduledTopicIds - topics already scheduled in pending sessions
 * @param {number} dayOffset - 0 = today
 */
export function getTopicForDay(
  completedTopicIds = [],
  scheduledTopicIds = [],
  dayOffset = 0,
) {
  const allTopics = [
    ...getTopicsByTrack("design"),
    ...getTopicsByTrack("verification"),
  ];
  const usedIds = new Set([...completedTopicIds, ...scheduledTopicIds]);

  let count = 0;
  for (const topic of allTopics) {
    if (usedIds.has(topic.id)) continue;
    if (!isTopicUnlocked(topic.id, completedTopicIds)) continue;
    if (count === dayOffset) return topic;
    count++;
  }
  return null;
}

/**
 * Generate a session title and auto-assign topic for a daily learning session.
 * @param {string[]} completedTopicIds
 * @param {string[]} scheduledTopicIds
 * @param {string} date - ISO date string YYYY-MM-DD
 */
export function buildDailyLearningSession(
  completedTopicIds = [],
  scheduledTopicIds = [],
  date = null,
) {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  // Day offset: how many days from today
  const dayOffset = Math.max(
    0,
    Math.round(
      (new Date(targetDate) - new Date(today)) / (1000 * 60 * 60 * 24),
    ),
  );

  const topic = getTopicForDay(completedTopicIds, scheduledTopicIds, dayOffset);
  if (!topic) {
    return {
      topic: null,
      title: "Review & Revision",
      suggestRevision: true,
    };
  }

  return {
    topic,
    title: `Learn: ${topic.title}`,
    suggestRevision: false,
  };
}

// ─── MISSED SESSION DETECTION ─────────────────────────────────────────────────

/**
 * Check all pending sessions and return those that should be marked missed.
 * A session is missed if its scheduled datetime + 20 min grace < now.
 * @param {Array} sessions
 * @returns {Array} sessions to move to backlog
 */
export function detectMissedSessions(sessions = []) {
  const now = Date.now();
  const GRACE_MS = 20 * 60 * 1000; // 20 minutes

  return sessions.filter((s) => {
    if (s.status !== "pending") return false;
    const timeStr = s.scheduled_time || "00:00";
    const sessionDateTime = new Date(s.scheduled_date + "T" + timeStr);
    return sessionDateTime.getTime() + GRACE_MS < now;
  });
}

// ─── AI-MONITORED COMPLETION ──────────────────────────────────────────────────

/**
 * Evaluate whether a session should be auto-completed based on activity signals.
 *
 * Completion criteria (any one of these is sufficient):
 * - Quiz taken for this topic with score >= 60%
 * - >= 5 flashcards reviewed for this topic
 * - Coding solution submitted for this topic
 * - Elapsed time >= estimatedHours * 0.5 (in-app time signal)
 *
 * @param {object} session
 * @param {object} activityData - { quizAttempts, flashcardCount, codingSolutions, elapsedMinutes }
 * @returns {{ shouldComplete: boolean, reason: string, confidence: number }}
 */
export function evaluateSessionCompletion(session, activityData = {}) {
  const {
    quizAttempts = [],
    flashcardCount = 0,
    codingSolutions = [],
    elapsedMinutes = 0,
  } = activityData;

  const reasons = [];
  let confidence = 0;

  // Check quiz activity
  const relevantQuizzes = quizAttempts.filter(
    (q) => q.topic_id === session.topic_id && q.score >= 60,
  );
  if (relevantQuizzes.length > 0) {
    const bestScore = Math.max(...relevantQuizzes.map((q) => q.score));
    reasons.push(`Quiz score: ${bestScore}%`);
    confidence = Math.max(confidence, bestScore / 100);
  }

  // Check flashcard activity
  if (flashcardCount >= 5) {
    reasons.push(`${flashcardCount} flashcards reviewed`);
    confidence = Math.max(confidence, 0.7);
  }

  // Check coding activity
  if (session.type === "coding" && codingSolutions.length > 0) {
    const passedSolutions = codingSolutions.filter((s) => s.passed === true);
    if (passedSolutions.length > 0) {
      reasons.push(`${passedSolutions.length} coding solution(s) passed validation`);
      confidence = Math.max(confidence, 0.9);
    } else {
      reasons.push(`${codingSolutions.length} solution(s) submitted (none passed yet)`);
      confidence = Math.max(confidence, 0.3);
    }
  }

  // Time-based heuristic
  if (elapsedMinutes >= 20) {
    reasons.push(`${elapsedMinutes} minutes active`);
    confidence = Math.max(confidence, Math.min(elapsedMinutes / 60, 0.9));
  }

  const shouldComplete = confidence >= 0.6;

  return {
    shouldComplete,
    reason:
      reasons.length > 0
        ? reasons.join(" | ")
        : "Insufficient activity detected",
    confidence: Math.round(confidence * 100),
    signals: {
      quizzes: relevantQuizzes.length,
      flashcards: flashcardCount,
      coding: codingSolutions.length,
      minutes: elapsedMinutes,
    },
  };
}

/**
 * Generate an AI prompt to evaluate session completion.
 * Used by the AI to make a more nuanced decision.
 */
export function buildCompletionEvalPrompt(session, topicTitle, activityData) {
  const {
    quizAttempts = [],
    flashcardCount = 0,
    codingSolutions = [],
    elapsedMinutes = 0,
  } = activityData;
  const bestQuiz =
    quizAttempts.length > 0
      ? Math.max(...quizAttempts.map((q) => q.score))
      : null;

  return `You are monitoring a student's study session completion for VLSI topic "${topicTitle}".

Session type: ${session.type}
Activity signals:
- Quiz attempts: ${quizAttempts.length} (best score: ${bestQuiz !== null ? bestQuiz + "%" : "N/A"})
- Flashcards reviewed: ${flashcardCount}
- Coding solutions: ${codingSolutions.length}
- Active time: ${elapsedMinutes} minutes

Based on these signals, respond with ONLY valid JSON:
{
  "shouldComplete": true or false,
  "confidence": 0-100,
  "reason": "brief explanation",
  "feedback": "1-2 sentence encouragement or suggestion for the student"
}

Rules:
- shouldComplete = true if the student has shown genuine engagement (>= 15 minutes OR quiz attempted OR 3+ flashcards)
- Be generous but not trivial — 5 minutes alone is not enough
- For coding sessions, a submission is strong evidence`;
}
