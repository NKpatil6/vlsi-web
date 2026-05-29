/**
 * Simulator Manager
 * Implements tool-priority logic:
 *
 *   RTL Design:   1. Vivado (local)   → 2. EDA Playground (cloud fallback)
 *   Verification: 1. QuestaSim (local) → 2. EDA Playground (cloud fallback)
 */

import { detectVivado } from "./vivadoService";
import { detectQuesta } from "./questaService";

/**
 * Get the appropriate simulator for a given track.
 * @param {"design"|"verification"} track
 * @param {{ vivado_path?: string, questasim_path?: string }} userSettings
 */
export async function getSimulatorForTrack(track, userSettings = {}) {
  if (track === "design") {
    const vivado = await detectVivado(userSettings.vivado_path);
    if (vivado.available) {
      return {
        simulator: "vivado",
        available: true,
        fallback: null,
        path: vivado.path,
        version: vivado.version,
        message: `Vivado ${vivado.version} detected`,
        isLocal: true,
        isCloud: false,
      };
    }
    // Fallback → EDA Playground
    return {
      simulator: "eda-playground",
      available: true,
      fallback: null,
      path: null,
      version: null,
      message: "Vivado not found — using EDA Playground for cloud simulation.",
      isLocal: false,
      isCloud: true,
    };
  }

  // Verification / UVM track
  const questa = await detectQuesta(userSettings.questasim_path);
  if (questa.available) {
    return {
      simulator: "questa",
      available: true,
      fallback: null,
      path: questa.path,
      version: questa.version,
      message: `QuestaSim ${questa.version || ""} detected`,
      isLocal: true,
      isCloud: false,
    };
  }
  // Fallback → EDA Playground
  return {
    simulator: "eda-playground",
    available: true,
    fallback: null,
    path: null,
    version: null,
    message: "QuestaSim not found — using EDA Playground for cloud simulation.",
    isLocal: false,
    isCloud: true,
  };
}

/**
 * Detect all installed simulators in parallel.
 */
export async function detectAll(userSettings = {}) {
  const [vivado, questa] = await Promise.all([
    detectVivado(userSettings.vivado_path),
    detectQuesta(userSettings.questasim_path),
  ]);
  return { vivado, questa };
}

/**
 * Resolve the effective tool given user selection + availability.
 * Implements the auto-switch priority rules.
 *
 * @param {{
 *   selectedTool: "auto"|"vivado"|"questa"|"eda",
 *   track: "design"|"verification",
 *   vivadoAvailable: boolean,
 *   questaAvailable: boolean,
 * }} opts
 * @returns {"vivado"|"questa"|"eda"}
 */
export function resolveEffectiveTool({ selectedTool, track, vivadoAvailable, questaAvailable }) {
  if (selectedTool === "eda") return "eda";
  if (selectedTool === "vivado") return vivadoAvailable ? "vivado" : "eda";
  if (selectedTool === "questa") return questaAvailable ? "questa" : "eda";
  // auto
  // Global priority required by UI: Vivado > QuestaSim > EDA Playground
  // (independent of track so tool detection badge is accurate at startup)
  if (vivadoAvailable) return "vivado";
  if (questaAvailable) return "questa";
  return "eda";
}
