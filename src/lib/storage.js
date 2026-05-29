/**
 * Electron-local persistence layer using localStorage.
 * Replaces all /api/* fetch calls with direct local storage.
 */

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Sessions ────────────────────────────────────────────────────────

export function getSessions(filters = {}) {
  let sessions = getJSON("vlsi_sessions", []);
  if (filters.status) sessions = sessions.filter((s) => s.status === filters.status);
  if (filters.date) sessions = sessions.filter((s) => s.scheduled_date === filters.date);
  return sessions;
}

export function createSession(data) {
  const sessions = getJSON("vlsi_sessions", []);
  const session = {
    id: genId(),
    title: data.title,
    topic_id: data.topicId || null,
    scheduled_date: data.scheduledDate,
    scheduled_time: data.scheduledTime || null,
    status: "pending",
    type: data.type || "study",
    notes: data.notes || "",
    recurrence: data.recurrence || "none",
    created_at: new Date().toISOString(),
    completed_at: null,
    duration_minutes: null,
  };
  sessions.push(session);
  setJSON("vlsi_sessions", sessions);
  return session;
}

export function updateSession(id, updates) {
  const sessions = getJSON("vlsi_sessions", []);
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...updates };
  setJSON("vlsi_sessions", sessions);
  return sessions[idx];
}

export function deleteSession(id) {
  const sessions = getJSON("vlsi_sessions", []);
  setJSON("vlsi_sessions", sessions.filter((s) => s.id !== id));
}

// ─── Sessions Backlog ────────────────────────────────────────────────

export function getBacklog() {
  return getJSON("vlsi_backlog", []);
}

export function addToBacklog(data) {
  const backlog = getJSON("vlsi_backlog", []);
  const item = {
    id: genId(),
    original_session_id: data.originalSessionId,
    topic_id: data.topicId,
    original_date: data.originalDate,
    type: data.type,
    title: data.title,
    notes: data.notes || "",
    created_at: new Date().toISOString(),
  };
  backlog.push(item);
  setJSON("vlsi_backlog", backlog);
  return item;
}

export function updateBacklogItem(id, updates) {
  const backlog = getJSON("vlsi_backlog", []);
  const idx = backlog.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  backlog[idx] = { ...backlog[idx], ...updates };
  setJSON("vlsi_backlog", backlog);
  return backlog[idx];
}

export function deleteBacklogItem(id) {
  const backlog = getJSON("vlsi_backlog", []);
  setJSON("vlsi_backlog", backlog.filter((b) => b.id !== id));
}

// ─── Progress ────────────────────────────────────────────────────────

export function getProgress() {
  return getJSON("vlsi_progress", []);
}

export function updateProgress(topicId, updates) {
  const progress = getJSON("vlsi_progress", []);
  const idx = progress.findIndex((p) => p.topic_id === topicId);
  if (idx >= 0) {
    progress[idx] = { ...progress[idx], ...updates };
  } else {
    progress.push({ topic_id: topicId, completed: false, time_spent_minutes: 0, ...updates });
  }
  setJSON("vlsi_progress", progress);
  return progress.find((p) => p.topic_id === topicId);
}

// ─── Analytics ───────────────────────────────────────────────────────

export function getAnalytics(days = 90) {
  const all = getJSON("vlsi_analytics", []);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return all.filter((a) => a.date >= cutoffStr);
}

export function getAnalyticsSummary() {
  const all = getJSON("vlsi_analytics", []);
  const summary = {
    total_study_minutes: 0,
    total_sessions_completed: 0,
    total_quizzes_completed: 0,
    total_coding_problems: 0,
    total_flashcards_reviewed: 0,
    streak: 0,
  };
  for (const a of all) {
    summary.total_study_minutes += a.study_minutes || 0;
    summary.total_sessions_completed += a.sessions_completed || 0;
    summary.total_quizzes_completed += a.quizzes_completed || 0;
    summary.total_coding_problems += a.coding_problems || 0;
    summary.total_flashcards_reviewed += a.flashcards_reviewed || 0;
  }
  // Calculate streak
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().split("T")[0];
  let d = new Date(today);
  for (const a of sorted) {
    const dateStr = d.toISOString().split("T")[0];
    if (a.date === dateStr && (a.study_minutes > 0 || a.sessions_completed > 0)) {
      summary.streak++;
      d.setDate(d.getDate() - 1);
    } else if (a.date < dateStr) {
      break;
    } else {
      d.setDate(d.getDate() - 1);
    }
  }
  return summary;
}

export function updateAnalytics(updates) {
  const all = getJSON("vlsi_analytics", []);
  const today = new Date().toISOString().split("T")[0];
  const idx = all.findIndex((a) => a.date === today);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
  } else {
    all.push({ date: today, study_minutes: 0, sessions_completed: 0, quizzes_completed: 0, coding_problems: 0, flashcards_reviewed: 0, ...updates });
  }
  setJSON("vlsi_analytics", all);
  return all.find((a) => a.date === today);
}

// ─── Achievements ────────────────────────────────────────────────────

const ACHIEVEMENT_DEFS = [
  { id: "first_session", name: "First Steps", description: "Complete your first study session", category: "sessions", icon: "🎯", threshold: 1, field: "sessions" },
  { id: "5_sessions", name: "Dedicated Learner", description: "Complete 5 study sessions", category: "sessions", icon: "📚", threshold: 5, field: "sessions" },
  { id: "25_sessions", name: "Knowledge Seeker", description: "Complete 25 study sessions", category: "sessions", icon: "🏆", threshold: 25, field: "sessions" },
  { id: "50_sessions", name: "VLSI Master", description: "Complete 50 study sessions", category: "sessions", icon: "👑", threshold: 50, field: "sessions" },
  { id: "first_quiz", name: "Quiz Rookie", description: "Complete your first quiz", category: "quizzes", icon: "✅", threshold: 1, field: "quizzes" },
  { id: "10_quizzes", name: "Quiz Enthusiast", description: "Complete 10 quizzes", category: "quizzes", icon: "🧠", threshold: 10, field: "quizzes" },
  { id: "3_day_streak", name: "Consistent", description: "Maintain a 3-day study streak", category: "consistency", icon: "🔥", threshold: 3, field: "streak" },
  { id: "7_day_streak", name: "Week Warrior", description: "Maintain a 7-day study streak", category: "consistency", icon: "⚡", threshold: 7, field: "streak" },
  { id: "30_day_streak", name: "Unstoppable", description: "Maintain a 30-day study streak", category: "consistency", icon: "💎", threshold: 30, field: "streak" },
  { id: "first_flashcard", name: "Card Flipper", description: "Review your first flashcard", category: "flashcards", icon: "🃏", threshold: 1, field: "flashcards" },
  { id: "50_flashcards", name: "Flashcard Pro", description: "Review 50 flashcards", category: "flashcards", icon: "📇", threshold: 50, field: "flashcards" },
  { id: "first_coding", name: "Code Warrior", description: "Solve your first coding problem", category: "coding", icon: "💻", threshold: 1, field: "coding" },
  { id: "10_coding", name: "Algorithm Ace", description: "Solve 10 coding problems", category: "coding", icon: "⚙️", threshold: 10, field: "coding" },
  { id: "design_track", name: "Design Explorer", description: "Complete 5 digital design topics", category: "tracks", icon: "🔧", threshold: 5, field: "designTopics" },
  { id: "dv_track", name: "Verification Pro", description: "Complete 5 verification topics", category: "tracks", icon: "🔍", threshold: 5, field: "dvTopics" },
];

export function getAchievements() {
  const summary = getAnalyticsSummary();
  const progress = getProgress();
  const completedTopics = progress.filter((p) => p.completed).length;

  const stats = {
    sessions: summary.total_sessions_completed,
    quizzes: summary.total_quizzes_completed,
    streak: summary.streak,
    flashcards: summary.total_flashcards_reviewed,
    coding: summary.total_coding_problems,
    designTopics: completedTopics,
    dvTopics: completedTopics,
  };

  const unlocked = getJSON("vlsi_unlocked_achievements", []);

  return ACHIEVEMENT_DEFS.map((def) => {
    const current = stats[def.field] || 0;
    const isUnlocked = current >= def.threshold;
    const wasUnlocked = unlocked.includes(def.id);
    if (isUnlocked && !wasUnlocked) {
      unlocked.push(def.id);
      setJSON("vlsi_unlocked_achievements", unlocked);
    }
    return {
      ...def,
      current: Math.min(current, def.threshold),
      unlocked: isUnlocked,
      unlocked_at: isUnlocked ? new Date().toISOString() : null,
    };
  });
}

// ─── Flashcards ──────────────────────────────────────────────────────

export function getFlashcards(topicId) {
  const all = getJSON("vlsi_flashcards", []);
  if (topicId) return all.filter((f) => f.topic_id === topicId);
  return all;
}

export function saveFlashcards(topicId, cards) {
  const all = getJSON("vlsi_flashcards", []);
  // Remove old cards for this topic
  const filtered = all.filter((f) => f.topic_id !== topicId);
  const newCards = cards.map((c) => ({
    id: genId(),
    topic_id: topicId,
    front: c.front,
    back: c.back,
    difficulty: c.difficulty || "medium",
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));
  const result = [...filtered, ...newCards];
  setJSON("vlsi_flashcards", result);
  return newCards;
}

export function reviewFlashcard(flashcardId, rating) {
  const all = getJSON("vlsi_flashcards", []);
  const idx = all.findIndex((f) => f.id === flashcardId);
  if (idx === -1) return null;
  // SM-2 algorithm
  const card = all[idx];
  let { ease_factor, interval, repetitions } = card;
  if (rating >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease_factor);
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));
  const next = new Date();
  next.setDate(next.getDate() + interval);
  all[idx] = { ...card, ease_factor, interval, repetitions, next_review: next.toISOString() };
  setJSON("vlsi_flashcards", all);
  return all[idx];
}

// ─── Quiz ────────────────────────────────────────────────────────────

export function saveQuizAttempt(data) {
  const attempts = getJSON("vlsi_quiz_attempts", []);
  const attempt = {
    id: genId(),
    topic_id: data.topicId,
    questions: data.questions,
    answers: data.answers,
    score: data.score,
    time_spent_seconds: data.timeSpentSeconds,
    created_at: new Date().toISOString(),
  };
  attempts.push(attempt);
  setJSON("vlsi_quiz_attempts", attempts);
  return attempt;
}

export function getQuizAttempts(topicId, limit = 10) {
  const attempts = getJSON("vlsi_quiz_attempts", []);
  let filtered = topicId ? attempts.filter((a) => a.topic_id === topicId) : attempts;
  return filtered.slice(-limit);
}

// ─── Coding ──────────────────────────────────────────────────────────

export function saveCodingSolution(data) {
  const solutions = getJSON("vlsi_coding_solutions", []);
  const solution = {
    id: genId(),
    topic_id: data.topicId,
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    starter_code: data.starterCode,
    solution: data.solution,
    user_code: data.userCode,
    time_spent_seconds: data.timeSpentSeconds,
    created_at: new Date().toISOString(),
  };
  solutions.push(solution);
  setJSON("vlsi_coding_solutions", solutions);
  return solution;
}

export function getCodingSolutions(topicId) {
  const solutions = getJSON("vlsi_coding_solutions", []);
  if (topicId) return solutions.filter((s) => s.topic_id === topicId);
  return solutions;
}

// ─── Settings ────────────────────────────────────────────────────────

export function getSettings() {
  return getJSON("vlsi_settings", {
    // AI provider selection: "groq" | "gemini"
    ai_provider: "groq",
    // Groq
    groq_api_key_set: false,
    groq_api_key: "",
    preferred_model: "llama-3.3-70b-versatile",
    // Gemini
    gemini_api_key: "",
    preferred_gemini_model: "gemini-2.0-flash",
    // Simulators
    questasim_path: "",
    vivado_path: "",
    // Session
    daily_study_goal: 60,
    session_shift_minutes: 30,
    sound_alerts: true,
  });
}

export function saveSettings(updates) {
  const current = getSettings();
  const merged = { ...current, ...updates };
  setJSON("vlsi_settings", merged);
  return merged;
}

// ─── Reset ───────────────────────────────────────────────────────────

export function resetAllData() {
  const keys = [
    "vlsi_sessions", "vlsi_backlog", "vlsi_progress", "vlsi_analytics",
    "vlsi_unlocked_achievements", "vlsi_flashcards", "vlsi_quiz_attempts",
    "vlsi_coding_solutions", "vlsi_settings",
  ];
  for (const key of keys) localStorage.removeItem(key);
}

// ─── Export ───────────────────────────────────────────────────────────

export function exportAllData() {
  return {
    sessions: getJSON("vlsi_sessions", []),
    backlog: getJSON("vlsi_backlog", []),
    progress: getJSON("vlsi_progress", []),
    analytics: getJSON("vlsi_analytics", []),
    flashcards: getJSON("vlsi_flashcards", []),
    quizAttempts: getJSON("vlsi_quiz_attempts", []),
    codingSolutions: getJSON("vlsi_coding_solutions", []),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
}
