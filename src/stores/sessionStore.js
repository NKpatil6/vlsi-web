import { create } from "zustand";
import { getSessions, createSession as storageCreate, updateSession as storageUpdate, deleteSession as storageDelete } from "@/lib/storage";

export const useSessionStore = create((set, get) => ({
  sessions: [],
  loading: false,
  error: null,

  fetchSessions: (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const sessions = getSessions(filters);
      set({ sessions, loading: false });
    } catch (error) {
      console.error("[Session Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  createSession: (sessionData) => {
    try {
      const session = storageCreate(sessionData);
      set((state) => ({ sessions: [session, ...state.sessions] }));
      return session;
    } catch (error) {
      console.error("[Session Store] Create error:", error);
      throw error;
    }
  },

  updateSession: (id, updates) => {
    try {
      const session = storageUpdate(id, updates);
      if (!session) throw new Error("Session not found");
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? session : s)),
      }));
      return session;
    } catch (error) {
      console.error("[Session Store] Update error:", error);
      throw error;
    }
  },

  deleteSession: (id) => {
    try {
      storageDelete(id);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error("[Session Store] Delete error:", error);
      throw error;
    }
  },

  completeSession: (id, durationMinutes = 0) => {
    return get().updateSession(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
    });
  },

  getUpcomingSessions: (limit = 5) => {
    const today = new Date().toISOString().split("T")[0];
    return get()
      .sessions.filter((s) => s.status === "pending" && s.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
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
    set({ sessions: [], loading: false, error: null });
  },
}));
