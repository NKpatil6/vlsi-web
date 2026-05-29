"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useSessionStore } from "@/stores/sessionStore";
import { useProgressStore } from "@/stores/progressStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useActiveSessionStore } from "@/stores/activeSessionStore";
import { TOPICS, getTopicById } from "@/data/syllabusData";
import {
  detectMissedSessions,
  buildDailyLearningSession,
  evaluateSessionCompletion,
  buildCompletionEvalPrompt,
} from "@/services/sessionEngine";
import { requestAI } from "@/ai/requestAI";
import {
  getBacklog, addToBacklog, updateBacklogItem, deleteBacklogItem,
  getQuizAttempts, getCodingSolutions, getAnalyticsSummary,
} from "@/lib/storage";
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
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  "in-progress": {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  completed: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
    dot: "bg-green-500",
  },
  missed: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  backlog: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
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
    durationMinutes: session?.duration_minutes || 30,
    recurrence: session?.recurrence || "one-time",
    weekdays: session?.weekdays || [new Date().getDay()],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#1a2235] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 sticky top-0 bg-[#1a2235]">
          <h2 className="text-lg font-semibold text-slate-100">
            {session ? "Edit Session" : "New Session"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Session Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., Study Boolean Algebra"
              className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type + Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Recurrence
              </label>
              <select
                value={form.recurrence}
                onChange={(e) => handleChange("recurrence", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <div className="flex items-start gap-2 mb-1">
                <Brain className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-blue-400 mb-0.5">
                    AI-Assigned Topic
                  </div>
                  {autoTopic?.topic ? (
                    <>
                      <div className="text-sm font-semibold text-blue-300">
                        {autoTopic.topic.title}
                      </div>
                      <div className="text-xs text-blue-400 mt-0.5">
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
                    <div className="text-sm text-blue-400">
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Topic
              </label>
              <select
                value={form.topicId}
                onChange={(e) => handleChange("topicId", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {form.recurrence === "daily" ? "Start Time (auto-scheduled daily)" : "Schedule Date & Time"}
            </label>
            {form.recurrence !== "daily" && (
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => handleChange("scheduledDate", e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            )}
            {form.recurrence === "daily" && (
              <div className="text-xs text-cyan-400 mb-2 px-1">
                Daily sessions auto-schedule starting today and progress through the syllabus each day.
              </div>
            )}
            <div className="flex gap-2">
              {/* Time picker */}
              <div className="flex items-center gap-1 border border-slate-700 rounded-lg px-2 bg-[#1a2235]">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
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
                <span className="text-slate-500 font-bold">:</span>
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
            <div className="text-xs text-slate-500 mt-1">
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

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={480}
              value={form.durationMinutes}
              onChange={(e) => handleChange("durationMinutes", parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Weekly weekday picker */}
          {form.recurrence === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Repeat on
              </label>
              <div className="flex gap-1.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
                  const selected = form.weekdays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const wd = selected
                          ? form.weekdays.filter((d) => d !== i)
                          : [...form.weekdays, i].sort();
                        handleChange("weekdays", wd.length > 0 ? wd : [i]);
                      }}
                      className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily recurrence info */}
          {form.recurrence === "daily" && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-300">
              <span className="font-semibold">Daily recurrence:</span> Each
              day's topic auto-advances through the syllabus. Missed sessions
              are automatically moved to the backlog.
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Focus areas, goals..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-[#1a2235] border border-slate-700 rounded-lg hover:bg-slate-700/50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#1a2235] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${danger ? "bg-red-500/10" : "bg-blue-500/10"}`}
        >
          <AlertCircle
            className={`w-5 h-5 ${danger ? "text-red-400" : "text-blue-400"}`}
          />
        </div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
        <p className="text-sm text-slate-400 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-slate-300 bg-[#1a2235] border border-slate-700 rounded-lg hover:bg-slate-700/50"
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
    <div className="bg-[#1a2235] border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-100">
              {item.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-2">
            <span className="bg-slate-700/50 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[item.type] || item.type}
            </span>
            {topic && <span className="text-purple-400">{topic.title}</span>}
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
                className="flex-1 px-2 py-1.5 text-xs border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setRescheduling(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-400"
              >
                <Calendar className="w-3.5 h-3.5" /> Reschedule
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => onResolve(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-green-400 hover:text-green-400"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => onDismiss(item.id)}
                className="text-xs text-slate-500 hover:text-red-500"
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
      className={`bg-[#1a2235] border rounded-xl p-5 transition-all hover:shadow-sm ${isPast ? "border-red-500/20 bg-red-500/5" : "border-slate-700 hover:border-slate-600"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`}
            />
            <h3 className="text-sm font-semibold text-slate-100 truncate">
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
              <span className="text-xs font-medium px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full flex-shrink-0">
                Overdue
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-1.5">
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
            <span className="bg-slate-700/50 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[session.type] || session.type}
            </span>
            <span className="bg-slate-700/50 px-2 py-0.5 rounded-full">
              {RECURRENCE_LABELS[session.recurrence] || session.recurrence}
            </span>
            {topic && (
              <span className="font-medium text-slate-300">{topic.title}</span>
            )}
          </div>

          {session.notes && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              {session.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(session.status === "pending" ||
            session.status === "in-progress") && (() => {
            // Time-window enforcement: allow start 20 min before to 20 min after scheduled time
            const now = new Date();
            const scheduled = new Date(session.scheduled_date + "T" + (session.scheduled_time || "09:00"));
            const windowStart = new Date(scheduled.getTime() - 20 * 60 * 1000);
            const windowEnd = new Date(scheduled.getTime() + 20 * 60 * 1000);
            const inWindow = now >= windowStart && now <= windowEnd;
            const isOverdue = now > windowEnd && session.status === "pending";
            const minutesUntilStart = Math.round((scheduled.getTime() - now.getTime()) / 60000);

            return (
              <>
                {session.status === "pending" && !inWindow && !isOverdue && (
                  <span className="text-xs text-slate-500 mr-1">
                    in {minutesUntilStart}m
                  </span>
                )}
                {session.status === "pending" && isOverdue && (
                  <span className="text-xs text-orange-400 mr-1">
                    overdue
                  </span>
                )}
                <button
                  onClick={() => onStart(session)}
                  disabled={aiCheckingId === session.id || (session.status === "pending" && !inWindow)}
                  title={session.status === "pending" && !inWindow ? `Available 20 min before scheduled time` : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    session.status === "pending" && !inWindow
                      ? "text-slate-500 bg-slate-700/50 cursor-not-allowed"
                      : "text-white bg-cyan-600 hover:bg-cyan-700"
                  } disabled:opacity-60`}
                >
                  {aiCheckingId === session.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {session.status === "in-progress" ? "AI Check" : "Start"}
                </button>
              </>
            );
          })()}
          <button
            onClick={() => onEdit(session)}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
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
      // Fetch activity signals from local storage
      const quizAttempts = getQuizAttempts(session.topic_id, 5);
      const codingSolutions = getCodingSolutions(session.topic_id);
      const analyticsSummary = getAnalyticsSummary();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#1a2235] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              AI Completion Check
            </h3>
            <p className="text-xs text-slate-400">"{session?.title}"</p>
          </div>
        </div>

        {checking && (
          <div className="text-center py-8">
            <div
              className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p className="text-sm text-slate-400">
              Evaluating your study activity...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              AI is checking quiz scores, flashcards, and coding activity
            </p>
          </div>
        )}

        {!checking && result && (
          <div className="space-y-4">
            {/* Confidence meter */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Completion confidence</span>
                <span className="font-semibold">{result.confidence}%</span>
              </div>
              <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${result.confidence >= 60 ? "bg-green-500" : result.confidence >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div
              className={`rounded-xl px-4 py-3 border ${result.shouldComplete && result.confidence >= 60 ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}
            >
              <div
                className={`text-sm font-semibold mb-1 ${result.shouldComplete && result.confidence >= 60 ? "text-green-400" : "text-yellow-300"}`}
              >
                {result.shouldComplete && result.confidence >= 60
                  ? "✅ Session Complete!"
                  : "⏳ Keep Studying"}
              </div>
              <div className="text-sm text-slate-300">{result.feedback}</div>
              {result.reason && (
                <div className="text-xs text-slate-400 mt-1">
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
                    className="flex-1 py-2.5 text-sm font-medium text-slate-300 bg-[#1a2235] border border-slate-700 rounded-xl hover:bg-slate-700/50"
                  >
                    Mark Complete Anyway
                  </button>
                  <button
                    onClick={onDismiss}
                    className="flex-1 py-2.5 text-sm font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/10"
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
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300"
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
  const {
    activeSessionId, elapsedSeconds, restoreActiveSession,
    startSession, stopSession, tick,
  } = useActiveSessionStore();

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [aiCheckSession, setAiCheckSession] = useState(null);
  const [backlog, setBacklog] = useState([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [missedDetected, setMissedDetected] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const didRunMissed = useRef(false);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    fetchSessions();
    fetchProgress();
    fetchBacklog();
    restoreActiveSession();
  }, []);

  // Timer tick for active session
  useEffect(() => {
    if (!activeSessionId) return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [activeSessionId, tick]);

  // Inactivity detection (every 10 min check)
  useEffect(() => {
    if (!activeSessionId) return;
    const handleActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    const checkInterval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs > 10 * 60 * 1000) { // 10 minutes
        setInactivityWarning(true);
      }
    }, 60 * 1000); // Check every minute

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearInterval(checkInterval);
    };
  }, [activeSessionId]);

  // Auto-detect and move missed sessions to backlog (runs every 60s)
  useEffect(() => {
    if (loading || sessions.length === 0) return;

    const checkMissed = () => {
      const currentSessions = useSessionStore.getState().sessions;
      const missed = detectMissedSessions(currentSessions);
      if (missed.length === 0) return;

      setMissedDetected(true);
      missed.forEach((s) => {
        try {
          updateSession(s.id, { status: "missed" });
          addToBacklog({
            originalSessionId: s.id,
            topicId: s.topic_id,
            originalDate: s.scheduled_date,
            type: s.type,
            title: s.title,
            notes: s.notes,
          });
        } catch (e) {
          console.error("Move to backlog error:", e);
        }
      });

      setTimeout(() => {
        fetchSessions();
        fetchBacklog();
      }, 500);
    };

    // Run immediately once, then every 60s
    if (!didRunMissed.current) {
      didRunMissed.current = true;
      checkMissed();
    }
    const interval = setInterval(checkMissed, 60 * 1000);
    return () => clearInterval(interval);
  }, [sessions, loading]);

  const fetchBacklog = () => {
    setBacklogLoading(true);
    try {
      setBacklog(getBacklog());
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
        durationMinutes: form.durationMinutes || 30,
        recurrence: form.recurrence,
        weekdays: form.weekdays || [],
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
        durationMinutes: form.durationMinutes || 30,
        recurrence: form.recurrence,
        weekdays: form.weekdays || [],
        notes: form.notes,
      });
      fetchSessions();
    },
    [editingSession, updateSession],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteSession(deleteTarget);
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
        startSession(session.id);
        fetchSessions();
      }
      // Open AI completion panel
      setAiCheckSession(session);
    },
    [updateSession, startSession],
  );

  const handleAIComplete = useCallback(
    async (session) => {
      const completedAt = new Date().toISOString();
      const duration = session.duration_minutes || 30;
      await updateSession(session.id, {
        status: "completed",
        completedAt,
        durationMinutes: duration,
      });
      await updateAnalytics({ studyMinutes: duration, sessionsCompleted: 1 });
      stopSession();
      fetchSessions();
      setAiCheckSession(null);
    },
    [updateSession, updateAnalytics],
  );

  const handleBacklogReschedule = (id, newDate) => {
    updateBacklogItem(id, { rescheduledDate: newDate });
    fetchBacklog();
  };

  const handleBacklogResolve = (id) => {
    updateBacklogItem(id, { resolved: true });
    fetchBacklog();
  };

  const handleBacklogDismiss = (id) => {
    deleteBacklogItem(id);
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
            <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-1">
              Study Sessions
            </h1>
            <p className="text-sm text-slate-400">
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
          <div className="flex items-start gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-4">
            <Archive className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-purple-300">
                Sessions moved to Backlog
              </div>
              <div className="text-xs text-purple-400">
                Past-due sessions were automatically moved to the backlog. You
                can reschedule or dismiss them.
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab("backlog");
                setMissedDetected(false);
              }}
              className="flex-shrink-0 text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg hover:bg-purple-500/20"
            >
              View Backlog
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-slate-700/50 rounded-xl p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5
                ${activeTab === tab.id ? "bg-[#1a2235] text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-slate-700/50 text-slate-400" : "text-slate-500"}`}
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
              <div className="text-center py-16 bg-[#1a2235] rounded-2xl border border-slate-700">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <p className="font-medium text-slate-300">Backlog is clear!</p>
                <p className="text-sm text-slate-500 mt-1">
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
              <div className="text-center py-16 bg-[#1a2235] rounded-2xl border border-slate-700">
                <div className="w-14 h-14 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7 text-slate-500" />
                </div>
                <p className="font-medium text-slate-300">No sessions found</p>
                <p className="text-sm text-slate-500 mt-1 mb-4">
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

      {/* Inactivity Warning */}
      {inactivityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1a2235] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Session Inactive</h3>
            <p className="text-sm text-slate-400 mb-5">
              Session appears inactive. Keep the app open and continue your session to maintain progress.
            </p>
            <button
              onClick={() => {
                setInactivityWarning(false);
                lastActivityRef.current = Date.now();
              }}
              className="w-full py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-xl hover:bg-cyan-700 transition-colors"
            >
              I&apos;m Still Here
            </button>
          </div>
        </div>
      )}

      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
