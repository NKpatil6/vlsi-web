/**
 * Code Validator — Top-Level Orchestrator
 * Combines static analysis, simulation (waveform/transcript), and AI review
 * into a single validation pipeline.
 */

import { analyzeCode } from "./vlsiStaticAnalyzer";
import { reviewCode } from "./vlsiCodeReviewer";
import { getSimulatorForTrack } from "./simulatorManager";
import { runVivadoSimulation } from "./vivadoService";
import { runQuestaSimulation } from "./questaService";
import { compareWaveforms } from "./waveformComparator";
import { parseTranscript } from "./transcriptAnalyzer";
import { extractPorts } from "./portExtractor";
import { generateTestbench } from "./testbenchGenerator";

/**
 * Run the full validation pipeline.
 * @param {{ userCode, problem, settings }}
 * @returns {{ passed, waveformValidated, simulatorUsed, fallbackMode, static, waveform, ai, transcript, overallScore, educationalFeedback }}
 */
export async function validateCode({ userCode, problem, settings = {} }) {
  // Layer 1: Static analysis (always, instant)
  const staticResult = analyzeCode(userCode);

  // Determine simulator for this track
  const track = problem.track || "design";
  const simConfig = await getSimulatorForTrack(track, settings);

  // Layer 2: Simulation (if available)
  let waveformResult = null;
  let transcriptResult = null;
  let simulatorUsed = "none";
  let fallbackMode = false;

  if (simConfig.available) {
    try {
      if (simConfig.simulator === "vivado" && track === "design") {
        const result = await runVivadoValidation(userCode, problem, simConfig.path);
        waveformResult = result.waveform;
        simulatorUsed = "vivado";
      } else if (simConfig.simulator === "questa" && track === "verification") {
        const result = await runQuestaValidation(userCode, problem, simConfig.path);
        transcriptResult = result.transcript;
        simulatorUsed = "questa";
      } else {
        fallbackMode = true;
      }
    } catch (e) {
      console.error("[CodeValidator] Simulation failed:", e);
      fallbackMode = true;
    }
  } else {
    fallbackMode = true;
  }

  // Layer 3: AI review (always, async, educational)
  let aiResult = null;
  try {
    aiResult = await reviewCode(problem, userCode, problem.solution || "");
  } catch (e) {
    console.error("[CodeValidator] AI review failed:", e);
  }

  // Determine final pass/fail
  let passed = false;
  let overallScore = staticResult.score;

  if (waveformResult) {
    // Waveform is source of truth for RTL
    passed = waveformResult.passed;
    overallScore = Math.round(
      waveformResult.score * 0.6 + staticResult.score * 0.2 + (aiResult?.overallScore || 0) * 0.2
    );
  } else if (transcriptResult) {
    // Transcript is source of truth for verification
    passed = transcriptResult.simulationResult === "pass";
    overallScore = passed ? 80 : 30;
  } else if (aiResult && !aiResult.aiError) {
    // AI fallback
    passed = aiResult.passed && aiResult.overallScore >= 60;
    overallScore = Math.round(aiResult.overallScore * 0.7 + staticResult.score * 0.3);
  } else {
    // Static-only fallback
    passed = staticResult.passed;
    overallScore = staticResult.score;
  }

  const educationalFeedback = buildEducationalFeedback({
    staticResult,
    waveformResult,
    transcriptResult,
    aiResult,
    fallbackMode,
    simulatorUsed,
  });

  return {
    passed,
    waveformValidated: !!waveformResult,
    simulatorUsed,
    fallbackMode,
    static: staticResult,
    waveform: waveformResult,
    ai: aiResult && !aiResult.aiError ? aiResult : null,
    transcript: transcriptResult,
    overallScore,
    educationalFeedback,
  };
}

/**
 * Run Vivado simulation for both reference and user code, then compare waveforms.
 */
async function runVivadoValidation(userCode, problem, vivadoPath) {
  const ports = extractPorts(userCode);
  if (ports.moduleName === "unknown") {
    return {
      waveform: { passed: false, score: 0, errors: ["Could not parse module name from code. Ensure your code has a valid 'module <name>' declaration."] },
    };
  }
  const tbCode = generateTestbench({
    moduleName: ports.moduleName,
    ports,
    vcdFileName: "output.vcd",
  });

  const codeFiles = [
    { name: `${ports.moduleName}.sv`, content: userCode },
    { name: `tb_${ports.moduleName}.sv`, content: tbCode },
  ];

  // Run user simulation
  const userSim = await runVivadoSimulation({
    codeFiles,
    topModule: `tb_${ports.moduleName}`,
    vivadoPath,
    timeout: 30000,
  });

  if (!userSim.success) {
    return {
      waveform: {
        passed: false,
        score: 0,
        mismatches: [],
        summary: `Simulation failed: ${userSim.errors?.join(", ") || "unknown error"}`,
      },
    };
  }

  // If we have a reference solution, simulate it too
  if (problem.solution) {
    const refPorts = extractPorts(problem.solution);
    const refTb = generateTestbench({
      moduleName: refPorts.moduleName,
      ports: refPorts,
      vcdFileName: "expected.vcd",
    });

    const refFiles = [
      { name: `${refPorts.moduleName}.sv`, content: problem.solution },
      { name: `tb_${refPorts.moduleName}.sv`, content: refTb },
    ];

    const refSim = await runVivadoSimulation({
      codeFiles: refFiles,
      topModule: `tb_${refPorts.moduleName}`,
      vivadoPath,
      timeout: 30000,
    });

    if (refSim.success && refSim.vcdPath && userSim.vcdPath) {
      // Compare waveforms
      const outputPortNames = ports.outputs.map((p) => p.name);
      // NOTE: In Electron, we'd read the VCD files via IPC
      // For now, return a placeholder indicating comparison would happen
      return {
        waveform: {
          passed: false,
          score: 0,
          mismatches: [],
          summary: "Waveform comparison requires Electron IPC to read VCD files.",
        },
      };
    }
  }

  // No reference solution — user sim ran but can't compare
  return {
    waveform: {
      passed: true,
      score: 70,
      mismatches: [],
      summary: "Simulation ran successfully. No reference solution to compare against.",
    },
  };
}

/**
 * Run QuestaSim simulation and parse transcript.
 */
async function runQuestaValidation(userCode, problem, questaPath) {
  const ports = extractPorts(userCode);
  const tbCode = generateTestbench({
    moduleName: ports.moduleName,
    ports,
    vcdFileName: "output.vcd",
  });

  const codeFiles = [
    { name: `${ports.moduleName}.sv`, content: userCode },
    { name: `tb_${ports.moduleName}.sv`, content: tbCode },
  ];

  const result = await runQuestaSimulation({
    codeFiles,
    topModule: `tb_${ports.moduleName}`,
    questaPath,
    timeout: 30000,
  });

  const transcript = parseTranscript(result.transcript || "");

  return {
    transcript: {
      ...transcript,
      passed: result.passed,
    },
  };
}

function buildEducationalFeedback({ staticResult, waveformResult, transcriptResult, aiResult, fallbackMode, simulatorUsed }) {
  const parts = [];

  if (fallbackMode) {
    parts.push("Simulator unavailable — using AI + static analysis for evaluation.");
  }

  if (waveformResult) {
    if (waveformResult.passed) {
      parts.push("Waveform validation passed — your design produces the expected outputs.");
    } else {
      parts.push(`Waveform validation found ${waveformResult.mismatches.length} mismatch(es).`);
      for (const m of waveformResult.mismatches.slice(0, 3)) {
        parts.push(`  • ${m.description}`);
      }
    }
  }

  if (transcriptResult) {
    if (transcriptResult.simulationResult === "pass") {
      parts.push("Simulation completed without errors.");
    } else {
      parts.push(`Simulation failed with ${transcriptResult.errors.length} error(s).`);
    }
  }

  if (aiResult?.feedback) {
    parts.push(`AI: ${aiResult.feedback}`);
  }

  if (aiResult?.hints?.length > 0) {
    parts.push(`Hint: ${aiResult.hints[0]}`);
  }

  return parts.join("\n");
}
