import { create } from "zustand";

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Storage] Failed to save ${key}:`, e.message);
  }
}

function safeGetItem(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

export const useActiveSessionStore = create((set) => ({
  activeSession: null,
  codingTask: null,
  editorCode: "",
  selectedTopic: null,
  selectedTool: null,
  simulationLogs: "",
  simAnalysis: null,

  startSession: (session) => {
    set({ activeSession: session });
    safeSetItem("vlsi_active_session", JSON.stringify(session));
  },

  endSession: () => {
    set({ activeSession: null });
    try { localStorage.removeItem("vlsi_active_session"); } catch {}
  },

  updateSessionProgress: (updates) => {
    set((state) => {
      if (!state.activeSession) return state;
      const updated = { ...state.activeSession, ...updates };
      safeSetItem("vlsi_active_session", JSON.stringify(updated));
      return { activeSession: updated };
    });
  },

  setCodingTask: (task) => {
    set({ codingTask: task });
    safeSetItem("vlsi_coding_task", JSON.stringify(task));
  },

  setEditorCode: (code) => {
    set({ editorCode: code });
    safeSetItem("vlsi_editor_code", code);
  },

  setSelectedTopic: (topic) => {
    set({ selectedTopic: topic });
    safeSetItem("vlsi_selected_topic", topic || "");
  },

  setSelectedTool: (tool) => {
    set({ selectedTool: tool });
    safeSetItem("vlsi_selected_tool", tool || "");
  },

  setSimulationLogs: (logs) => {
    set({ simulationLogs: logs });
    safeSetItem("vlsi_simulation_logs", logs);
  },

  setSimAnalysis: (analysis) => {
    set({ simAnalysis: analysis });
    safeSetItem("vlsi_sim_analysis", JSON.stringify(analysis));
  },

  restoreCodingState: () => {
    try {
      const task = safeGetItem("vlsi_coding_task");
      const code = safeGetItem("vlsi_editor_code");
      const topic = safeGetItem("vlsi_selected_topic");
      const tool = safeGetItem("vlsi_selected_tool");
      const logs = safeGetItem("vlsi_simulation_logs");
      const analysis = safeGetItem("vlsi_sim_analysis");
      set({
        codingTask: task ? JSON.parse(task) : null,
        editorCode: code || "",
        selectedTopic: topic || null,
        selectedTool: tool || null,
        simulationLogs: logs || "",
        simAnalysis: analysis ? JSON.parse(analysis) : null,
      });
    } catch (e) {
      console.warn("[Session Store] Failed to restore coding state:", e.message);
    }
  },

  restoreActiveSession: () => {
    try {
      const session = safeGetItem("vlsi_active_session");
      if (session) {
        set({ activeSession: JSON.parse(session) });
      }
    } catch (e) {
      console.warn("[Session Store] Failed to restore active session:", e.message);
    }
  },

  clearAll: () => {
    set({
      activeSession: null,
      codingTask: null,
      editorCode: "",
      selectedTopic: null,
      selectedTool: null,
      simulationLogs: "",
      simAnalysis: null,
    });
    try {
      localStorage.removeItem("vlsi_active_session");
      localStorage.removeItem("vlsi_coding_task");
      localStorage.removeItem("vlsi_editor_code");
      localStorage.removeItem("vlsi_selected_topic");
      localStorage.removeItem("vlsi_selected_tool");
      localStorage.removeItem("vlsi_simulation_logs");
      localStorage.removeItem("vlsi_sim_analysis");
    } catch {}
  },
}));
