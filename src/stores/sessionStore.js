import { create } from "zustand";

export const useSessionStore = create((set, get) => ({
  // State
  sessions: [],
  loading: false,
  error: null,
  lastFetch: null,

  // Actions
  fetchSessions: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.date) params.append("date", filters.date);

      const response = await fetch(`/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      set({
        sessions: data.sessions || [],
        loading: false,
        lastFetch: Date.now(),
      });
    } catch (error) {
      console.error("[Session Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  createSession: async (sessionData) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const data = await response.json();

      set((state) => ({
        sessions: [data.session, ...state.sessions],
      }));

      return data.session;
    } catch (error) {
      console.error("[Session Store] Create error:", error);
      throw error;
    }
  },

  updateSession: async (id, updates) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) throw new Error("Failed to update session");

      const data = await response.json();

      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? data.session : s)),
      }));

      return data.session;
    } catch (error) {
      console.error("[Session Store] Update error:", error);
      throw error;
    }
  },

  deleteSession: async (id) => {
    try {
      const response = await fetch(`/api/sessions?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete session");

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error("[Session Store] Delete error:", error);
      throw error;
    }
  },

  completeSession: async (id, durationMinutes = 0) => {
    const completedAt = new Date().toISOString();
    return get().updateSession(id, {
      status: "completed",
      completedAt,
      durationMinutes,
    });
  },

  // Selectors
  getUpcomingSessions: (limit = 5) => {
    const today = new Date().toISOString().split("T")[0];
    return get()
      .sessions.filter(
        (s) => s.status === "pending" && s.scheduled_date >= today,
      )
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, limit);
  },

  getSessionsByTopic: (topicId) => {
    return get().sessions.filter((s) => s.topic_id === topicId);
  },

  getTodaySessions: () => {
    const today = new Date().toISOString().split("T")[0];
    return get().sessions.filter((s) => s.scheduled_date === today);
  },

  reset: () => {
    set({ sessions: [], loading: false, error: null, lastFetch: null });
  },
}));
