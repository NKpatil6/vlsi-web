import { create } from "zustand";

export const useProgressStore = create((set, get) => ({
  // State
  progress: [], // Array of user_progress objects
  loading: false,
  error: null,
  lastFetch: null,

  // Actions
  fetchProgress: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/progress");
      if (!response.ok) throw new Error("Failed to fetch progress");

      const data = await response.json();
      set({
        progress: data.progress || [],
        loading: false,
        lastFetch: Date.now(),
      });
    } catch (error) {
      console.error("[Progress Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  updateProgress: async (topicId, updates) => {
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, ...updates }),
      });

      if (!response.ok) throw new Error("Failed to update progress");

      const data = await response.json();

      // Update local state
      set((state) => ({
        progress: state.progress.some((p) => p.topic_id === topicId)
          ? state.progress.map((p) =>
              p.topic_id === topicId ? data.progress : p,
            )
          : [...state.progress, data.progress],
      }));

      return data.progress;
    } catch (error) {
      console.error("[Progress Store] Update error:", error);
      throw error;
    }
  },

  // Selectors
  getTopicProgress: (topicId) => {
    const state = get();
    return state.progress.find((p) => p.topic_id === topicId) || null;
  },

  isTopicCompleted: (topicId) => {
    const progress = get().getTopicProgress(topicId);
    return progress?.completed || false;
  },

  getCompletedTopicIds: () => {
    return get()
      .progress.filter((p) => p.completed)
      .map((p) => p.topic_id);
  },

  getTotalTimeSpent: () => {
    return get().progress.reduce(
      (sum, p) => sum + (p.time_spent_minutes || 0),
      0,
    );
  },

  reset: () => {
    set({ progress: [], loading: false, error: null, lastFetch: null });
  },
}));
