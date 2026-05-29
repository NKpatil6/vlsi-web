/**
 * Vivado xsim Simulation Service
 * 3-step pipeline: xvlog (compile) → xelab (elaborate) → xsim (simulate)
 *
 * In Electron: delegates to main process via IPC
 * In web: returns not-available with guidance
 */

export function isElectron() {
  return typeof window !== "undefined" && !!window?.electronAPI;
}

/**
 * Detect Vivado installation.
 */
export async function detectVivado(customPath) {
  if (isElectron()) {
    try {
      return await window.electronAPI.checkVivado(customPath);
    } catch (e) {
      return { available: false, path: null, version: null, error: e.message };
    }
  }
  return {
    available: false,
    path: null,
    version: null,
    webMode: true,
    error: "Vivado simulation requires the desktop (Electron) version.",
  };
}

/**
 * Run full Vivado simulation pipeline.
 * @param {{ codeFiles: [{name: string, content: string}], topModule: string, vivadoPath: string, timeout?: number }}
 */
export async function runVivadoSimulation({
  codeFiles,
  topModule,
  vivadoPath,
  timeout = 30000,
}) {
  if (isElectron()) {
    try {
      return await window.electronAPI.runVivado({
        files: codeFiles,
        topModule,
        vivadoPath,
        timeout,
      });
    } catch (e) {
      return {
        success: false,
        errors: [e.message],
        compileErrors: [],
        elaborateErrors: [],
        warnings: [],
        output: "",
        vcdPath: null,
      };
    }
  }

  // Web mode: return guidance
  return {
    success: false,
    errors: ["Vivado simulation requires the desktop (Electron) version."],
    compileErrors: [],
    elaborateErrors: [],
    warnings: [],
    output: "",
    vcdPath: null,
    webMode: true,
    guidance: [
      "1. Save your code to a .sv file",
      "2. Open Vivado and create a simulation project",
      "3. Add your source files",
      "4. Run behavioral simulation",
      "5. Compare waveforms manually",
    ],
  };
}

/**
 * Generate Vivado simulation commands for manual execution.
 */
export function getVivadoCommands(fileNames, topModule) {
  return {
    compile: `xvlog -sv ${fileNames.join(" ")}`,
    elaborate: `xelab -top ${topModule} -snapshot snap`,
    simulate: `xsim snap -runall`,
    full: `xvlog -sv ${fileNames.join(" ")} && xelab -top ${topModule} -snapshot snap && xsim snap -runall`,
  };
}
