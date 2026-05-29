import { create } from "zustand";

/**
 * Persists the active session state across page switches.
 * Stored in localStorage so it survives route changes and rerenders.
 */
export const useActiveSessionStore = create((set, get) => ({
  // Active session data
  activeSessionId: null,
  startedAt: null,
  elapsedSeconds: 0,
  isPaused: false,

  // Coding task persistence
  codingTask: null,
  editorCode: "",
  selectedTopic: null,
  selectedTool: null,
  simulationLogs: "",
  simAnalysis: null,

  // Start a session
  startSession: (sessionId) => {
    const now = Date.now();
    set({
      activeSessionId: sessionId,
      startedAt: now,
      elapsedSeconds: 0,
      isPaused: false,
    });
    localStorage.setItem("vlsi_active_session", JSON.stringify({
      activeSessionId: sessionId,
      startedAt: now,
    }));
  },

  // Stop the active session
  stopSession: () => {
    set({
      activeSessionId: null,
      startedAt: null,
      elapsedSeconds: 0,
      isPaused: false,
    });
    localStorage.removeItem("vlsi_active_session");
  },

  // Update elapsed time (called by timer interval)
  tick: () => {
    const { startedAt, isPaused } = get();
    if (!startedAt || isPaused) return;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    set({ elapsedSeconds: elapsed });
  },

  // Pause/resume
  togglePause: () => {
    set((s) => ({ isPaused: !s.isPaused }));
  },

  // Coding state persistence
  setCodingTask: (task) => {
    set({ codingTask: task });
    localStorage.setItem("vlsi_coding_task", JSON.stringify(task));
  },

  setEditorCode: (code) => {
    set({ editorCode: code });
    localStorage.setItem("vlsi_editor_code", code);
  },

  setSelectedTopic: (topic) => {
    set({ selectedTopic: topic });
    localStorage.setItem("vlsi_selected_topic", topic || "");
  },

  setSelectedTool: (tool) => {
    set({ selectedTool: tool });
    localStorage.setItem("vlsi_selected_tool", tool || "");
  },

  setSimulationLogs: (logs) => {
    set({ simulationLogs: logs });
    localStorage.setItem("vlsi_simulation_logs", logs || "");
  },

  setSimAnalysis: (analysis) => {
    set({ simAnalysis: analysis });
    try {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify(analysis));
    } catch {}
  },

  // Restore coding state from localStorage
  restoreCodingState: () => {
    try {
      const task = JSON.parse(localStorage.getItem("vlsi_coding_task") || "null");
      const code = localStorage.getItem("vlsi_editor_code") || "";
      const topic = localStorage.getItem("vlsi_selected_topic") || null;
      const tool = localStorage.getItem("vlsi_selected_tool") || null;
      const logs = localStorage.getItem("vlsi_simulation_logs") || "";
      const analysis = JSON.parse(localStorage.getItem("vlsi_sim_analysis") || "null");
      set({ codingTask: task, editorCode: code, selectedTopic: topic, selectedTool: tool, simulationLogs: logs, simAnalysis: analysis });
    } catch {}
  },

  // Restore active session from localStorage
  restoreActiveSession: () => {
    try {
      const data = JSON.parse(localStorage.getItem("vlsi_active_session") || "null");
      if (data && data.activeSessionId) {
        set({
          activeSessionId: data.activeSessionId,
          startedAt: data.startedAt,
          elapsedSeconds: Math.floor((Date.now() - data.startedAt) / 1000),
        });
      }
    } catch {}
  },

  // Clear coding state
  clearCodingState: () => {
    set({ codingTask: null, editorCode: "", selectedTopic: null, selectedTool: null, simulationLogs: "", simAnalysis: null });
    localStorage.removeItem("vlsi_coding_task");
    localStorage.removeItem("vlsi_editor_code");
    localStorage.removeItem("vlsi_selected_topic");
    localStorage.removeItem("vlsi_selected_tool");
    localStorage.removeItem("vlsi_simulation_logs");
    localStorage.removeItem("vlsi_sim_analysis");
  },
}));
