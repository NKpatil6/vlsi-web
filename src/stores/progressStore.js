import { create } from "zustand";
import { getProgress, updateProgress as storageUpdate } from "@/lib/storage";

export const useProgressStore = create((set, get) => ({
  progress: [],
  loading: false,
  error: null,

  fetchProgress: () => {
    set({ loading: true, error: null });
    try {
      const progress = getProgress();
      set({ progress, loading: false });
    } catch (error) {
      console.error("[Progress Store]", error);
      set({ error: error.message, loading: false });
    }
  },

  updateProgress: (topicId, updates) => {
    try {
      const result = storageUpdate(topicId, updates);
      set((state) => ({
        progress: state.progress.some((p) => p.topic_id === topicId)
          ? state.progress.map((p) => (p.topic_id === topicId ? result : p))
          : [...state.progress, result],
      }));
      return result;
    } catch (error) {
      console.error("[Progress Store] Update error:", error);
      throw error;
    }
  },

  getTopicProgress: (topicId) => {
    return get().progress.find((p) => p.topic_id === topicId) || null;
  },

  isTopicCompleted: (topicId) => {
    const progress = get().getTopicProgress(topicId);
    return progress?.completed || false;
  },

  getCompletedTopicIds: () => {
    return get().progress.filter((p) => p.completed).map((p) => p.topic_id);
  },

  getTotalTimeSpent: () => {
    return get().progress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
  },

  reset: () => {
    set({ progress: [], loading: false, error: null });
  },
}));
