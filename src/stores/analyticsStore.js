import { create } from "zustand";
import { getAnalytics, getAnalyticsSummary, updateAnalytics as storageUpdate } from "@/lib/storage";

export const useAnalyticsStore = create((set, get) => ({
  analytics: [],
  summary: null,
  loading: false,
  error: null,

  fetchAnalytics: (days = 90) => {
    set({ loading: true, error: null });
    try {
      const analytics = getAnalytics(days);
      set({ analytics, loading: false });
    } catch (error) {
      console.error("[Analytics Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSummary: () => {
    try {
      const summary = getAnalyticsSummary();
      set({ summary });
      return summary;
    } catch (error) {
      console.error("[Analytics Store] Summary error:", error);
      return null;
    }
  },

  updateAnalytics: (updates) => {
    try {
      const result = storageUpdate(updates);
      set((state) => {
        const idx = state.analytics.findIndex((a) => a.date === result.date);
        if (idx >= 0) {
          const updated = [...state.analytics];
          updated[idx] = result;
          return { analytics: updated };
        }
        return { analytics: [result, ...state.analytics] };
      });
      // Re-fetch summary silently
      get().fetchSummary();
      return result;
    } catch (error) {
      console.error("[Analytics Store] Update error:", error);
      return null;
    }
  },

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
      totalMinutes: analytics.reduce((sum, a) => sum + (a.study_minutes || 0), 0),
      totalSessions: analytics.reduce((sum, a) => sum + (a.sessions_completed || 0), 0),
      totalQuizzes: analytics.reduce((sum, a) => sum + (a.quizzes_completed || 0), 0),
    };
  },

  reset: () => {
    set({ analytics: [], summary: null, loading: false, error: null });
  },
}));

function getActivityLevel(minutes) {
  if (minutes === 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}
