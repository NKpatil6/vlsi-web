/**
 * EDA Playground Service
 * Builds code packages for cloud simulation and launches edaplayground.com.
 *
 * EDA Playground has no public URL-preload API, so the real workflow is:
 *   1. Build the design + testbench text package
 *   2. Copy it to the clipboard so the user can paste into EDA Playground
 *   3. Open edaplayground.com in the system browser
 *
 * In Electron, step 3 uses electronAPI.openExternal (already wired in preload.cjs).
 * In browser/dev mode it falls back to window.open.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EDALanguage = "verilog" | "systemverilog" | "uvm";
export type EDASimulator =
  | "synopsys-vcs"
  | "cadence-xcelium"
  | "mentor-questa"
  | "verilator"
  | "icarus";

export interface EDASimulatorInfo {
  id: EDASimulator;
  name: string;
  description: string;
  supportsUVM: boolean;
  supportsWaveform: boolean;
  bestFor: string[];
}

export interface EDAPayload {
  designCode: string;
  testbenchCode: string;
  language: EDALanguage;
  simulator: EDASimulator;
  topModule: string;
  waveformEnabled: boolean;
  clipboardText: string;
  launchUrl: string;
}

export interface EDAOpenResult {
  success: boolean;
  payload: EDAPayload;
  clipboardCopied: boolean;
  error?: string;
}

// ─── Simulator Registry ───────────────────────────────────────────────────────

export const EDA_SIMULATORS: EDASimulatorInfo[] = [
  {
    id: "synopsys-vcs",
    name: "Synopsys VCS",
    description: "Industry-leading simulator, best for SystemVerilog/UVM",
    supportsUVM: true,
    supportsWaveform: true,
    bestFor: ["systemverilog", "uvm"],
  },
  {
    id: "cadence-xcelium",
    name: "Cadence Xcelium",
    description: "High-performance with strong assertion support",
    supportsUVM: true,
    supportsWaveform: true,
    bestFor: ["systemverilog", "uvm"],
  },
  {
    id: "mentor-questa",
    name: "Mentor Questa",
    description: "Full UVM support, industry standard for verification",
    supportsUVM: true,
    supportsWaveform: true,
    bestFor: ["uvm", "systemverilog"],
  },
  {
    id: "verilator",
    name: "Verilator",
    description: "Open-source, fast, best for synthesizable RTL",
    supportsUVM: false,
    supportsWaveform: true,
    bestFor: ["verilog", "systemverilog"],
  },
  {
    id: "icarus",
    name: "Icarus Verilog",
    description: "Open-source Verilog simulator, great for RTL basics",
    supportsUVM: false,
    supportsWaveform: true,
    bestFor: ["verilog"],
  },
];

export function getSupportedSimulators(): EDASimulatorInfo[] {
  return EDA_SIMULATORS;
}

// ─── Tool Priority / Auto-Switch Logic ───────────────────────────────────────

/**
 * Returns the recommended EDA Playground simulator for a given track.
 * RTL design → prefer VCS; Verification/UVM → prefer Questa.
 */
export function getRecommendedSimulator(
  track: "design" | "verification",
  language: EDALanguage,
): EDASimulator {
  if (track === "verification" || language === "uvm") return "mentor-questa";
  if (language === "systemverilog") return "synopsys-vcs";
  return "icarus"; // plain Verilog RTL
}

/**
 * Determines whether EDA Playground should be shown as the primary tool.
 * Returns true when no local simulator is configured/available.
 */
export function shouldUseEDAPlayground(opts: {
  track: "design" | "verification";
  vivadoAvailable: boolean;
  questaAvailable: boolean;
  selectedTool: string;
}): boolean {
  const { track, vivadoAvailable, questaAvailable, selectedTool } = opts;
  if (selectedTool === "eda") return true;
  if (selectedTool === "auto") {
    if (track === "design") return !vivadoAvailable;
    return !questaAvailable;
  }
  return false;
}

// ─── Testbench Generator ─────────────────────────────────────────────────────

/**
 * Generates a minimal but runnable SystemVerilog testbench for a given module.
 * Infers ports from the RTL code using a simple regex scan.
 */
export function generateTestbenchForEDA(
  moduleName: string,
  userCode: string,
  language: EDALanguage,
): string {
  // Extract port names from module declaration
  const portRegex =
    /(?:input|output|inout)\s+(?:logic|reg|wire)?\s*(?:\[\d+:\d+\])?\s*(\w+)/g;
  const ports: { dir: string; name: string }[] = [];
  const modulePortBlock = userCode.match(/module\s+\w+\s*\(([^)]*)\)/s)?.[1] ?? "";
  let m: RegExpExecArray | null;
  const dirRegex =
    /(input|output|inout)\s+(?:logic|reg|wire)?\s*(?:\[\d+:\d+\])?\s*(\w+)/g;
  while ((m = dirRegex.exec(modulePortBlock)) !== null) {
    ports.push({ dir: m[1], name: m[2] });
  }

  const inputs = ports.filter((p) => p.dir === "input");
  const outputs = ports.filter((p) => p.dir === "output");

  const clkSignal = inputs.find((p) => /clk|clock/i.test(p.name));
  const rstSignal = inputs.find((p) => /rst|reset/i.test(p.name));
  const hasClk = !!clkSignal;
  const hasRst = !!rstSignal;

  const declarations = [
    ...inputs.map((p) => `  logic ${p.name};`),
    ...outputs.map((p) => `  logic ${p.name};`),
  ].join("\n");

  const portConnections = ports.map((p) => `    .${p.name}(${p.name})`).join(",\n");

  const clkGen = hasClk
    ? `\n  // Clock generation\n  initial ${clkSignal.name} = 0;\n  always #5 ${clkSignal.name} = ~${clkSignal.name};\n`
    : "";

  const rstSeq = hasRst
    ? `    ${rstSignal.name} = 1; #20;\n    ${rstSignal.name} = 0; #10;\n`
    : "";

  const outputChecks = outputs
    .map(
      (p) =>
        `    $display("[%0t] ${p.name} = %b", $time, ${p.name});`,
    )
    .join("\n");

  return `\`timescale 1ns/1ps
// Auto-generated testbench for ${moduleName}
// Generated by VLSI Tracker — EDA Playground flow

module tb_${moduleName};

${declarations || "  // No ports detected — add your signals here"}
${clkGen}
  // DUT instantiation
  ${moduleName} dut (
${portConnections || "    // connect ports here"}
  );

  // Stimulus
  initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, tb_${moduleName});
${rstSeq}
    // ── Add your test vectors below ──
    #50;
${outputChecks}
    // ── End of test ──
    #20;
    $display("Simulation complete.");
    $finish;
  end

endmodule
`;
}

// ─── Payload Builder ─────────────────────────────────────────────────────────

export interface BuildPayloadOptions {
  userCode: string;
  testbench?: string;
  moduleName?: string;
  language?: EDALanguage;
  simulator?: EDASimulator;
  track?: "design" | "verification";
  waveformEnabled?: boolean;
}

export function buildPayload(opts: BuildPayloadOptions): EDAPayload {
  const {
    userCode,
    track = "design",
    waveformEnabled = true,
  } = opts;

  // Infer module name from code
  const moduleMatch = userCode.match(/module\s+(\w+)/);
  const moduleName = opts.moduleName ?? moduleMatch?.[1] ?? "vlsi_design";

  // Infer language
  const language: EDALanguage =
    opts.language ??
    (track === "verification"
      ? "uvm"
      : /`timescale|always_ff|logic\s/.test(userCode)
        ? "systemverilog"
        : "verilog");

  const simulator: EDASimulator =
    opts.simulator ?? getRecommendedSimulator(track, language);

  const testbench =
    opts.testbench ?? generateTestbenchForEDA(moduleName, userCode, language);

  // Build the clipboard text — formatted for easy paste into EDA Playground
  const clipboardText = buildClipboardText({
    moduleName,
    designCode: userCode,
    testbenchCode: testbench,
    language,
    simulator,
    waveformEnabled,
  });

  // EDA Playground base URL — no code preload possible via URL
  const launchUrl = "https://www.edaplayground.com/";

  return {
    designCode: userCode,
    testbenchCode: testbench,
    language,
    simulator,
    topModule: moduleName,
    waveformEnabled,
    clipboardText,
    launchUrl,
  };
}

// ─── Clipboard Formatter ──────────────────────────────────────────────────────

function buildClipboardText(opts: {
  moduleName: string;
  designCode: string;
  testbenchCode: string;
  language: EDALanguage;
  simulator: EDASimulator;
  waveformEnabled: boolean;
}): string {
  const simInfo = EDA_SIMULATORS.find((s) => s.id === opts.simulator);
  const langLabel =
    opts.language === "uvm"
      ? "SystemVerilog (UVM)"
      : opts.language === "systemverilog"
        ? "SystemVerilog"
        : "Verilog";

  return [
    "═══════════════════════════════════════════════════",
    "  VLSI Tracker — EDA Playground Session",
    "═══════════════════════════════════════════════════",
    `  Module      : ${opts.moduleName}`,
    `  Language    : ${langLabel}`,
    `  Simulator   : ${simInfo?.name ?? opts.simulator}`,
    `  Waveform    : ${opts.waveformEnabled ? "Enabled (dump.vcd)" : "Disabled"}`,
    "",
    "  SETUP STEPS:",
    "  1. Go to edaplayground.com and sign in",
    `  2. Set Language to: ${langLabel}`,
    `  3. Set Simulator to: ${simInfo?.name ?? opts.simulator}`,
    "  4. Paste the DESIGN CODE into the left panel",
    "  5. Paste the TESTBENCH CODE into the right panel",
    "  6. Click Run",
    "  7. Copy the output and paste back into VLSI Tracker",
    "═══════════════════════════════════════════════════",
    "",
    "── DESIGN CODE (" + opts.moduleName + ".sv) ──────────────────────",
    opts.designCode,
    "",
    "── TESTBENCH CODE (tb_" + opts.moduleName + ".sv) ─────────────────",
    opts.testbenchCode,
  ].join("\n");
}

// ─── Launch ───────────────────────────────────────────────────────────────────

/**
 * Copies the code package to clipboard and opens EDA Playground.
 * Uses Electron's shell.openExternal when available, falls back to window.open.
 */
export async function openInEDAPlayground(
  payload: EDAPayload,
): Promise<EDAOpenResult> {
  let clipboardCopied = false;

  // 1. Copy to clipboard
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload.clipboardText);
      clipboardCopied = true;
    }
  } catch {
    // Clipboard write failed — non-fatal
  }

  // 2. Open browser
  try {
    const electron = (window as Window & { electronAPI?: { openExternal: (url: string) => Promise<void> } }).electronAPI;
    if (electron?.openExternal) {
      await electron.openExternal(payload.launchUrl);
    } else {
      window.open(payload.launchUrl, "_blank", "noopener,noreferrer");
    }
    return { success: true, payload, clipboardCopied };
  } catch (err) {
    return {
      success: false,
      payload,
      clipboardCopied,
      error: err instanceof Error ? err.message : "Failed to open browser",
    };
  }
}

/**
 * Convenience: build payload and open in one call.
 */
export async function buildAndOpen(
  opts: BuildPayloadOptions,
): Promise<EDAOpenResult> {
  const payload = buildPayload(opts);
  return openInEDAPlayground(payload);
}
