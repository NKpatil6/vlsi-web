"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useSessionStore } from "@/stores/sessionStore";
import { useProgressStore } from "@/stores/progressStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { TOPICS, getTopicById } from "@/data/syllabusData";
import {
  detectMissedSessions,
  buildDailyLearningSession,
  evaluateSessionCompletion,
  buildCompletionEvalPrompt,
} from "@/services/sessionEngine";
import { requestAI } from "@/ai/requestAI";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  AlertCircle,
  X,
  Save,
  RefreshCw,
  Archive,
  Zap,
  ArrowRight,
  Play,
  Info,
  Brain,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    dot: "bg-yellow-400",
  },
  "in-progress": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  completed: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  missed: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  backlog: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    dot: "bg-purple-400",
  },
};

const TYPE_LABELS = {
  learning: "📚 Learning",
  coding: "💻 Coding",
  revision: "🔄 Revision",
};
const RECURRENCE_LABELS = {
  "one-time": "One-time",
  daily: "Daily",
  weekly: "Weekly",
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

// ─── Session Creation Modal ───────────────────────────────────────────────────

function SessionModal({
  session,
  completedTopicIds,
  pendingSessions,
  onClose,
  onSave,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: session?.title || "",
    type: session?.type || "learning",
    topicId: session?.topic_id || "",
    scheduledDate: session?.scheduled_date || today,
    scheduledTime: session?.scheduled_time || "09:00",
    recurrence: session?.recurrence || "one-time",
    notes: session?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoTopic, setAutoTopic] = useState(null);
  const [hourVal, setHourVal] = useState(
    form.scheduledTime.split(":")[0] || "09",
  );
  const [minVal, setMinVal] = useState(
    form.scheduledTime.split(":")[1] || "00",
  );

  // Compute auto-topic for daily learning sessions
  useEffect(() => {
    if (form.type === "learning" && form.recurrence === "daily" && !session) {
      const scheduledIds = (pendingSessions || [])
        .filter((s) => s.type === "learning")
        .map((s) => s.topic_id);
      const result = buildDailyLearningSession(
        completedTopicIds,
        scheduledIds,
        form.scheduledDate,
      );
      setAutoTopic(result);
      if (result.topic) {
        setForm((f) => ({
          ...f,
          title: result.title,
          topicId: result.topic.id,
        }));
      }
    } else if (form.type !== "learning" || form.recurrence !== "daily") {
      setAutoTopic(null);
    }
  }, [form.type, form.recurrence, form.scheduledDate]);

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleTimeChange = (h, m) => {
    setHourVal(h);
    setMinVal(m);
    setForm((f) => ({ ...f, scheduledTime: `${h}:${m}` }));
  };

  const isDailyAuto =
    form.type === "learning" && form.recurrence === "daily" && !session;

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.topicId && !isDailyAuto) {
      setError("Topic is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, scheduledTime: `${hourVal}:${minVal}` });
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {session ? "Edit Session" : "New Session"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Session Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., Study Boolean Algebra"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type + Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Recurrence
              </label>
              <select
                value={form.recurrence}
                onChange={(e) => handleChange("recurrence", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-topic banner for daily learning */}
          {isDailyAuto && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-start gap-2 mb-1">
                <Brain className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-blue-700 mb-0.5">
                    AI-Assigned Topic
                  </div>
                  {autoTopic?.topic ? (
                    <>
                      <div className="text-sm font-semibold text-blue-900">
                        {autoTopic.topic.title}
                      </div>
                      <div className="text-xs text-blue-600 mt-0.5">
                        Topic {autoTopic.topic.order} •{" "}
                        {autoTopic.topic.estimatedHours}h •{" "}
                        {autoTopic.topic.difficulty}
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        Daily sessions auto-progress through the syllabus in
                        order. Tomorrow will be the next topic.
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-blue-700">
                      🎉 All topics scheduled! Session will focus on revision.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Topic selector (shown when not daily auto-learning) */}
          {!isDailyAuto && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Topic
              </label>
              <select
                value={form.topicId}
                onChange={(e) => handleChange("topicId", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a topic...</option>
                <optgroup label="📐 Digital Design Track">
                  {TOPICS.filter((t) => t.track === "design").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.order}. {t.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="✅ Verification Track">
                  {TOPICS.filter((t) => t.track === "verification").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.order}. {t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Date + Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Schedule Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => handleChange("scheduledDate", e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Time picker */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 bg-white">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={hourVal}
                  onChange={(e) => handleTimeChange(e.target.value, minVal)}
                  className="text-sm py-2 border-none outline-none bg-transparent"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400 font-bold">:</span>
                <select
                  value={minVal}
                  onChange={(e) => handleTimeChange(hourVal, e.target.value)}
                  className="text-sm py-2 border-none outline-none bg-transparent"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Scheduled for:{" "}
              {new Date(
                form.scheduledDate + "T" + hourVal + ":" + minVal,
              ).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              at {hourVal}:{minVal}
            </div>
          </div>

          {/* Daily recurrence info */}
          {form.recurrence === "daily" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              <span className="font-semibold">Daily recurrence:</span> Each
              day's topic auto-advances through the syllabus. Missed sessions
              are automatically moved to the backlog.
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Focus areas, goals..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw
                className="w-4 h-4"
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Session"}
          </button>
        </div>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${danger ? "bg-red-100" : "bg-blue-100"}`}
        >
          <AlertCircle
            className={`w-5 h-5 ${danger ? "text-red-600" : "text-blue-600"}`}
          />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 text-sm font-medium text-white rounded-lg ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Backlog Card ─────────────────────────────────────────────────────────────

function BacklogCard({ item, onReschedule, onResolve, onDismiss }) {
  const topic = getTopicById(item.topic_id);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  return (
    <div className="bg-white border border-purple-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">
              {item.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[item.type] || item.type}
            </span>
            {topic && <span className="text-purple-700">{topic.title}</span>}
            <span>
              Originally:{" "}
              {new Date(item.original_date + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              )}
            </span>
          </div>

          {/* Reschedule controls */}
          {rescheduling ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  onReschedule(item.id, newDate);
                  setRescheduling(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Reschedule
              </button>
              <button
                onClick={() => setRescheduling(false)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setRescheduling(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Calendar className="w-3.5 h-3.5" /> Reschedule
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onResolve(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onDismiss(item.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, onEdit, onDelete, onStart, aiCheckingId }) {
  const topic = getTopicById(session.topic_id);
  const styles = STATUS_STYLES[session.status] || STATUS_STYLES.pending;
  const today = new Date().toISOString().split("T")[0];
  const isToday = session.scheduled_date === today;
  const isPast = session.scheduled_date < today && session.status === "pending";

  return (
    <div
      className={`bg-white border rounded-xl p-5 transition-all hover:shadow-sm ${isPast ? "border-red-200 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`}
            />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {session.title}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${styles.bg} ${styles.text} ${styles.border}`}
            >
              {session.status}
            </span>
            {isToday && (
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full flex-shrink-0">
                Today
              </span>
            )}
            {isPast && (
              <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full flex-shrink-0">
                Overdue
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-1.5">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(
                session.scheduled_date + "T00:00:00",
              ).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {session.scheduled_time && (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {session.scheduled_time}
                </span>
              )}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[session.type] || session.type}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {RECURRENCE_LABELS[session.recurrence] || session.recurrence}
            </span>
            {topic && (
              <span className="font-medium text-gray-700">{topic.title}</span>
            )}
          </div>

          {session.notes && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
              {session.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(session.status === "pending" ||
            session.status === "in-progress") && (
            <button
              onClick={() => onStart(session)}
              disabled={aiCheckingId === session.id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {aiCheckingId === session.id ? (
                <RefreshCw
                  className="w-3.5 h-3.5"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {session.status === "in-progress" ? "AI Check" : "Start"}
            </button>
          )}
          <button
            onClick={() => onEdit(session)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Completion Panel ──────────────────────────────────────────────────────

function AICompletionPanel({ session, onComplete, onDismiss }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const topic = getTopicById(session?.topic_id);

  const handleAICheck = useCallback(async () => {
    if (!session) return;
    setChecking(true);
    try {
      // Fetch activity signals
      const [quizRes, flashRes, codingRes] = await Promise.allSettled([
        fetch(`/api/quiz?topicId=${session.topic_id}&limit=5`).then((r) =>
          r.json(),
        ),
        fetch(`/api/analytics/summary`).then((r) => r.json()),
        fetch(`/api/coding?topicId=${session.topic_id}`).then((r) => r.json()),
      ]);

      const quizAttempts =
        quizRes.status === "fulfilled" ? quizRes.value.attempts || [] : [];
      const codingSolutions =
        codingRes.status === "fulfilled" ? codingRes.value.solutions || [] : [];

      // Local heuristic first
      const heuristic = evaluateSessionCompletion(session, {
        quizAttempts,
        flashcardCount: 0,
        codingSolutions,
        elapsedMinutes: 25, // Assume active
      });

      // AI verification
      const prompt = buildCompletionEvalPrompt(
        session,
        topic?.title || session.topic_id,
        {
          quizAttempts,
          flashcardCount: 0,
          codingSolutions,
          elapsedMinutes: 25,
        },
      );

      const aiRes = await requestAI(prompt, { model: "llama-3.1-8b-instant" });

      let aiResult = null;
      if (aiRes.success && aiRes.content) {
        try {
          const cleaned = aiRes.content
            .trim()
            .replace(/```json\n?/g, "")
            .replace(/```/g, "")
            .trim();
          aiResult = JSON.parse(cleaned);
        } catch {
          /* use heuristic fallback */
        }
      }

      const finalResult = aiResult || {
        shouldComplete: heuristic.shouldComplete,
        confidence: heuristic.confidence,
        reason: heuristic.reason,
        feedback: heuristic.shouldComplete
          ? "Great job! You've shown solid engagement with this topic."
          : "Keep studying — try taking a quiz or reviewing flashcards for this topic.",
      };

      setResult(finalResult);
      if (finalResult.shouldComplete && finalResult.confidence >= 60) {
        setTimeout(() => onComplete(session), 1500);
      }
    } catch (e) {
      console.error("AI completion check failed:", e);
      setResult({
        shouldComplete: false,
        confidence: 0,
        reason: "Check failed",
        feedback: "Unable to evaluate. You can complete manually.",
      });
    } finally {
      setChecking(false);
    }
  }, [session, topic, onComplete]);

  useEffect(() => {
    handleAICheck();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              AI Completion Check
            </h3>
            <p className="text-xs text-gray-500">"{session?.title}"</p>
          </div>
        </div>

        {checking && (
          <div className="text-center py-8">
            <div
              className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p className="text-sm text-gray-600">
              Evaluating your study activity...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              AI is checking quiz scores, flashcards, and coding activity
            </p>
          </div>
        )}

        {!checking && result && (
          <div className="space-y-4">
            {/* Confidence meter */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span>Completion confidence</span>
                <span className="font-semibold">{result.confidence}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${result.confidence >= 60 ? "bg-green-500" : result.confidence >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div
              className={`rounded-xl px-4 py-3 border ${result.shouldComplete && result.confidence >= 60 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
            >
              <div
                className={`text-sm font-semibold mb-1 ${result.shouldComplete && result.confidence >= 60 ? "text-green-800" : "text-yellow-800"}`}
              >
                {result.shouldComplete && result.confidence >= 60
                  ? "✅ Session Complete!"
                  : "⏳ Keep Studying"}
              </div>
              <div className="text-sm text-gray-700">{result.feedback}</div>
              {result.reason && (
                <div className="text-xs text-gray-500 mt-1">
                  {result.reason}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {result.shouldComplete && result.confidence >= 60 ? (
                <button
                  onClick={() => onComplete(session)}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700"
                >
                  ✓ Mark Complete
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onComplete(session)}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Mark Complete Anyway
                  </button>
                  <button
                    onClick={onDismiss}
                    className="flex-1 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100"
                  >
                    Continue Studying
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Sessions Page ───────────────────────────────────────────────────────

export default function SessionsPage() {
  const {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  } = useSessionStore();
  const { getCompletedTopicIds, fetchProgress } = useProgressStore();
  const { updateAnalytics } = useAnalyticsStore();

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [aiCheckSession, setAiCheckSession] = useState(null);
  const [backlog, setBacklog] = useState([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [missedDetected, setMissedDetected] = useState(false);
  const didRunMissed = useRef(false);

  useEffect(() => {
    fetchSessions();
    fetchProgress();
    fetchBacklog();
  }, []);

  // Auto-detect and move missed sessions to backlog (runs once after sessions load)
  useEffect(() => {
    if (loading || didRunMissed.current || sessions.length === 0) return;
    didRunMissed.current = true;

    const missed = detectMissedSessions(sessions);
    if (missed.length === 0) return;

    setMissedDetected(true);
    // Move each missed session to backlog and mark as missed
    missed.forEach(async (s) => {
      try {
        // Mark as missed
        await updateSession(s.id, { status: "missed" });
        // Add to backlog
        await fetch("/api/sessions/backlog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalSessionId: s.id,
            topicId: s.topic_id,
            originalDate: s.scheduled_date,
            type: s.type,
            title: s.title,
            notes: s.notes,
          }),
        });
      } catch (e) {
        console.error("Move to backlog error:", e);
      }
    });

    setTimeout(() => {
      fetchSessions();
      fetchBacklog();
    }, 500);
  }, [sessions, loading]);

  const fetchBacklog = async () => {
    setBacklogLoading(true);
    try {
      const res = await fetch("/api/sessions/backlog");
      if (res.ok) {
        const data = await res.json();
        setBacklog(data.backlog || []);
      }
    } catch (e) {
      console.error("Backlog fetch error:", e);
    } finally {
      setBacklogLoading(false);
    }
  };

  const completedTopicIds = getCompletedTopicIds();
  const pendingSessions = sessions.filter(
    (s) => s.status === "pending" || s.status === "in-progress",
  );

  const handleCreate = useCallback(
    async (form) => {
      await createSession({
        title: form.title,
        type: form.type,
        topicId: form.topicId,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        recurrence: form.recurrence,
        notes: form.notes,
      });
      fetchSessions();
    },
    [createSession],
  );

  const handleEdit = useCallback(
    async (form) => {
      await updateSession(editingSession.id, {
        title: form.title,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        recurrence: form.recurrence,
        notes: form.notes,
      });
      fetchSessions();
    },
    [editingSession, updateSession],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/sessions?id=${deleteTarget}`, { method: "DELETE" });
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
    setDeleteTarget(null);
  }, [deleteTarget]);

  const handleStartSession = useCallback(
    async (session) => {
      // Mark as in-progress
      if (session.status === "pending") {
        await updateSession(session.id, { status: "in-progress" });
        fetchSessions();
      }
      // Open AI completion panel
      setAiCheckSession(session);
    },
    [updateSession],
  );

  const handleAIComplete = useCallback(
    async (session) => {
      const completedAt = new Date().toISOString();
      await updateSession(session.id, {
        status: "completed",
        completedAt,
        durationMinutes: 30,
      });
      await updateAnalytics({ studyMinutes: 30, sessionsCompleted: 1 });
      fetchSessions();
      setAiCheckSession(null);
    },
    [updateSession, updateAnalytics],
  );

  const handleBacklogReschedule = async (id, newDate) => {
    await fetch("/api/sessions/backlog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rescheduledDate: newDate }),
    });
    fetchBacklog();
  };

  const handleBacklogResolve = async (id) => {
    await fetch("/api/sessions/backlog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: true }),
    });
    fetchBacklog();
  };

  const handleBacklogDismiss = async (id) => {
    await fetch(`/api/sessions/backlog?id=${id}`, { method: "DELETE" });
    fetchBacklog();
  };

  // Filter sessions for tabs
  const today = new Date().toISOString().split("T")[0];
  const tabSessions = {
    all: sessions,
    today: sessions.filter((s) => s.scheduled_date === today),
    pending: sessions.filter((s) => s.status === "pending"),
    completed: sessions.filter((s) => s.status === "completed"),
    missed: sessions.filter((s) => s.status === "missed"),
  };

  const currentSessions = (tabSessions[activeTab] || tabSessions.all).sort(
    (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date),
  );

  const tabs = [
    { id: "all", label: "All", count: sessions.length },
    { id: "today", label: "Today", count: tabSessions.today.length },
    { id: "pending", label: "Pending", count: tabSessions.pending.length },
    {
      id: "completed",
      label: "Completed",
      count: tabSessions.completed.length,
    },
    { id: "missed", label: "Missed", count: tabSessions.missed.length },
    { id: "backlog", label: "Backlog", count: backlog.length },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
              Study Sessions
            </h1>
            <p className="text-sm text-gray-500">
              AI-scheduled daily learning with automatic topic progression
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSession(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        {/* Missed sessions banner */}
        {missedDetected && (
          <div className="flex items-start gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl mb-4">
            <Archive className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-purple-800">
                Sessions moved to Backlog
              </div>
              <div className="text-xs text-purple-600">
                Past-due sessions were automatically moved to the backlog. You
                can reschedule or dismiss them.
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab("backlog");
                setMissedDetected(false);
              }}
              className="flex-shrink-0 text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-200"
            >
              View Backlog
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5
                ${activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-gray-100 text-gray-600" : "text-gray-400"}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Backlog tab */}
        {activeTab === "backlog" && (
          <div>
            {backlogLoading ? (
              <div className="flex items-center justify-center py-16">
                <div
                  className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            ) : backlog.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <p className="font-medium text-gray-700">Backlog is clear!</p>
                <p className="text-sm text-gray-400 mt-1">
                  No missed sessions to reschedule
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {backlog.map((item) => (
                  <BacklogCard
                    key={item.id}
                    item={item}
                    onReschedule={handleBacklogReschedule}
                    onResolve={handleBacklogResolve}
                    onDismiss={handleBacklogDismiss}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions list */}
        {activeTab !== "backlog" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div
                  className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            ) : currentSessions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">No sessions found</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  {activeTab === "all"
                    ? "Create your first study session"
                    : `No ${activeTab} sessions`}
                </p>
                {activeTab === "all" && (
                  <button
                    onClick={() => {
                      setEditingSession(null);
                      setShowModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Create Session
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onEdit={(s) => {
                      setEditingSession(s);
                      setShowModal(true);
                    }}
                    onDelete={(id) => setDeleteTarget(id)}
                    onStart={handleStartSession}
                    aiCheckingId={aiCheckSession?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <SessionModal
          session={editingSession}
          completedTopicIds={completedTopicIds}
          pendingSessions={pendingSessions}
          onClose={() => {
            setShowModal(false);
            setEditingSession(null);
          }}
          onSave={editingSession ? handleEdit : handleCreate}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Session"
          message="Are you sure? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {aiCheckSession && (
        <AICompletionPanel
          session={aiCheckSession}
          onComplete={handleAIComplete}
          onDismiss={() => setAiCheckSession(null)}
        />
      )}
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
