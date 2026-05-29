/**
 * QuestaSim Simulation Service
 * 2-step pipeline: vlog (compile) → vsim (simulate)
 *
 * In Electron: delegates to main process via IPC
 * In web: returns not-available with guidance
 */

export function isElectron() {
  return typeof window !== "undefined" && !!window?.electronAPI;
}

/**
 * Detect QuestaSim installation.
 */
export async function detectQuesta(customPath) {
  if (isElectron()) {
    try {
      return await window.electronAPI.checkQuestasim(customPath);
    } catch (e) {
      return { available: false, path: null, version: null, error: e.message };
    }
  }
  return {
    available: false,
    path: null,
    version: null,
    webMode: true,
    error: "QuestaSim simulation requires the desktop (Electron) version.",
  };
}

/**
 * Run QuestaSim simulation.
 */
export async function runQuestaSimulation({
  codeFiles,
  topModule,
  questaPath,
  timeout = 30000,
}) {
  if (isElectron()) {
    try {
      return await window.electronAPI.runVSim({
        files: codeFiles,
        topModule,
        questaPath,
        timeout,
      });
    } catch (e) {
      return {
        success: false,
        transcript: "",
        errors: [e.message],
        warnings: [],
        passed: false,
      };
    }
  }

  return {
    success: false,
    transcript: "",
    errors: ["QuestaSim simulation requires the desktop (Electron) version."],
    warnings: [],
    passed: false,
    webMode: true,
    guidance: [
      "1. Save your code to a .sv file",
      "2. Open QuestaSim and compile: vlog -sv your_file.sv",
      "3. Simulate: vsim -c top_module -do 'run -all; quit'",
      "4. Check transcript for errors",
    ],
  };
}

/**
 * Generate QuestaSim commands for manual execution.
 */
export function getQuestaCommands(fileNames, topModule) {
  return {
    compile: `vlog -sv ${fileNames.join(" ")}`,
    simulate: `vsim -c ${topModule} -do "run -all; quit"`,
    full: `vlog -sv ${fileNames.join(" ")} && vsim -c ${topModule} -do "run -all; quit"`,
  };
}
