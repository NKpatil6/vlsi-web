import { create } from "zustand";

export const useAnalyticsStore = create((set, get) => ({
  // State
  analytics: [],
  summary: null,
  loading: false,
  error: null,
  lastFetch: null,

  // Actions
  fetchAnalytics: async (days = 90) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/analytics?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      set({
        analytics: data.analytics || [],
        loading: false,
        lastFetch: Date.now(),
      });
    } catch (error) {
      console.error("[Analytics Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const response = await fetch("/api/analytics/summary");
      if (!response.ok) throw new Error("Failed to fetch summary");

      const data = await response.json();
      set({ summary: data.summary });
      return data.summary;
    } catch (error) {
      console.error("[Analytics Store] Summary error:", error);
      // Don't throw — return null gracefully so callers don't crash
      return null;
    }
  },

  updateAnalytics: async (updates) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, ...updates }),
      });

      if (!response.ok) throw new Error("Failed to update analytics");

      const data = await response.json();

      // Update local state
      set((state) => {
        const existingIndex = state.analytics.findIndex(
          (a) => a.date === today,
        );
        if (existingIndex >= 0) {
          const updated = [...state.analytics];
          updated[existingIndex] = data.analytics;
          return { analytics: updated };
        } else {
          return { analytics: [data.analytics, ...state.analytics] };
        }
      });

      // Re-fetch summary silently
      get()
        .fetchSummary()
        .catch(() => {});

      return data.analytics;
    } catch (error) {
      console.error("[Analytics Store] Update error:", error);
      // Don't throw so UI callers don't crash
      return null;
    }
  },

  // Selectors
  getHeatmapData: () => {
    return get().analytics.map((a) => ({
      date: a.date,
      count: a.study_minutes || 0,
      level: getActivityLevel(a.study_minutes || 0),
    }));
  },

  getWeeklyStats: () => {
    const analytics = get().analytics.slice(0, 7);
    return {
      totalMinutes: analytics.reduce(
        (sum, a) => sum + (a.study_minutes || 0),
        0,
      ),
      totalSessions: analytics.reduce(
        (sum, a) => sum + (a.sessions_completed || 0),
        0,
      ),
      totalQuizzes: analytics.reduce(
        (sum, a) => sum + (a.quizzes_completed || 0),
        0,
      ),
    };
  },

  reset: () => {
    set({
      analytics: [],
      summary: null,
      loading: false,
      error: null,
      lastFetch: null,
    });
  },
}));

function getActivityLevel(minutes) {
  if (minutes === 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}
