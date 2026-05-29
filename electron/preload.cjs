/**
 * Electron Preload Script
 * Bridges main process IPC to renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ─── Vivado ──────────────────────────────────────────────────────────────
  checkVivado: (customPath) => ipcRenderer.invoke("vivado:detect", customPath),
  runVivado: (params) => ipcRenderer.invoke("vivado:run", params),

  // ─── QuestaSim ───────────────────────────────────────────────────────────
  checkQuestasim: (customPath) => ipcRenderer.invoke("questa:detect", customPath),
  runVSim: (params) => ipcRenderer.invoke("questa:run", params),

  // ─── File System ─────────────────────────────────────────────────────────
  writeTempFiles: (params) => ipcRenderer.invoke("fs:writeTemp", params),
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  cleanupTemp: (dir) => ipcRenderer.invoke("fs:cleanup", dir),

  // ─── Shell ───────────────────────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});
