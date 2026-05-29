"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import { generateCodingProblem, generateWaveformDiagnostic } from "@/ai/requestAI";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useActiveSessionStore } from "@/stores/activeSessionStore";
import { saveCodingSolution, getSettings } from "@/lib/storage";
import {
  buildAndOpen,
  generateTestbenchForEDA,
  getRecommendedSimulator,
} from "@/services/edaPlaygroundService";
import { resolveEffectiveTool } from "@/services/simulatorManager";
import {
  checkQuestasimStatus,
  runInQuestasim,
  generateTestbench,
  generateTclScript,
  getSimulationCommands,
} from "@/services/questasimService";
import TerminalPanel from "@/components/TerminalPanel";
import {
  Code2, Play, AlertCircle, Zap, CheckCircle2, RefreshCw,
  BookOpen, Lightbulb, Terminal, Copy, ChevronDown, ChevronUp,
  Info, ExternalLink, ClipboardPaste, Cpu, Activity,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"];
const DIFFICULTY_COLORS = {
  beginner: "text-green-400 bg-green-500/10 border-green-500/20",
  intermediate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  advanced: "text-red-400 bg-red-500/10 border-red-500/20",
};

// ─── Code Editor ──────────────────────────────────────────────────────────────

function CodeEditor({ value, onChange, readOnly = false, label }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      {label && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-slate-600">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-slate-400 font-mono ml-2">{label}</span>
          {readOnly && <span className="ml-auto text-xs text-slate-400">read-only</span>}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className="w-full bg-gray-900 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none"
        style={{ minHeight: 280, fontFamily: "'JetBrains Mono','Fira Code',monospace", lineHeight: 1.6 }}
      />
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function CodingToolbar({
  problem, userCode, effectiveTool, questaAvailable,
  onRun, onSimulate, onGenerateWaveform, onOpenEDA, onPasteEDA, onAnalyzeAI,
  running, simRunning, analyzingSim, edaOpening, showPasteModal,
}) {
  const btn = "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const disabled = !problem || !userCode;

  return (
    <div data-testid="coding-toolbar" className="flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl mb-4">
      {/* Run */}
      <button onClick={onRun} disabled={disabled || running}
        className={`${btn} bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30`} title="Static syntax check">
        {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
        Run
      </button>

      {/* Simulate (local) */}
      {effectiveTool !== "eda" && (
        <button onClick={onSimulate} disabled={disabled || simRunning || !questaAvailable}
          className={`${btn} bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30`}
          title={questaAvailable ? "Run in local simulator" : "Local simulator not detected"}>
          {simRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
          Simulate
        </button>
      )}

      {/* Generate Waveform */}
      <button onClick={onGenerateWaveform} disabled={disabled || analyzingSim}
        className={`${btn} bg-cyan-600/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30`}
        title="AI waveform diagnostic">
        {analyzingSim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        Generate Waveform
      </button>

      {/* Open in EDA Playground */}
      <button onClick={onOpenEDA} disabled={disabled || edaOpening}
        data-testid="open-eda-btn"
        className={`${btn} bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30`}
        title="Copy code to clipboard and open EDA Playground">
        {edaOpening ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
        Open in EDA Playground
      </button>

      {/* Paste EDA Output */}
      <button onClick={onPasteEDA} disabled={!problem}
        className={`${btn} ${showPasteModal ? "bg-amber-600/30 border-amber-400/40 text-amber-300" : "bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/30"}`}
        title="Paste simulation output from EDA Playground">
        <ClipboardPaste className="w-3.5 h-3.5" />
        Paste EDA Output
      </button>

      {/* Analyze with AI */}
      <button onClick={onAnalyzeAI} disabled={disabled || analyzingSim}
        className={`${btn} bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30`}
        title="Analyze with AI">
        {analyzingSim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        Analyze with AI
      </button>

      {/* Active tool badge */}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Tool:</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
          effectiveTool === "eda" ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
          : effectiveTool === "vivado" ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
          : "text-purple-400 bg-purple-500/10 border-purple-500/20"
        }`}>
          {effectiveTool === "eda" ? "EDA Playground" : effectiveTool === "vivado" ? "Vivado" : "QuestaSim"}
        </span>
      </div>
    </div>
  );
}

// ─── EDA Paste Modal ──────────────────────────────────────────────────────────

function EDAPasteModal({ open, onClose, onAnalyze, analyzing, simAnalysis, simOutput }) {
  const [pasteText, setPasteText] = useState(simOutput || "");

  useEffect(() => { if (open) setPasteText(simOutput || ""); }, [open, simOutput]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <ClipboardPaste className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">Paste EDA Playground Output</div>
            <div className="text-xs text-slate-400">Paste compile logs, runtime output, or assertion failures</div>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste your EDA Playground output here...\n\nExamples:\n  • Compile errors: "Error: syntax error near 'always'"\n  • Runtime output: "# Time=100 data_out=8'hFF"\n  • Assertion failures: "Assertion failed at time 250"\n  • Waveform mismatches: "Expected 1, got 0 at t=50ns"`}
            rows={10}
            className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />

          <div className="flex flex-wrap gap-2">
            {["Compile logs", "Runtime logs", "Waveform mismatches", "Assertion failures", "Timing violations"].map((t) => (
              <span key={t} className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{t}</span>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => onAnalyze(pasteText)} disabled={analyzing || !pasteText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-60 transition-colors">
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
              Close
            </button>
          </div>

          {simAnalysis && (
            <div className={`rounded-xl border p-4 ${simAnalysis.success ? "bg-cyan-500/10 border-cyan-500/20" : "bg-red-500/10 border-red-500/20"}`}>
              <div className={`text-xs font-semibold mb-2 ${simAnalysis.success ? "text-cyan-400" : "text-red-400"}`}>
                {simAnalysis.success ? "AI Diagnostic Analysis" : "Analysis Error"}
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
                {simAnalysis.success ? simAnalysis.diagnostic : simAnalysis.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EDA Launch Banner ────────────────────────────────────────────────────────

function EDALaunchBanner({ result, onDismiss }) {
  if (!result) return null;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${result.success ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20"}`}>
      <ExternalLink className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result.success ? "text-blue-400" : "text-red-400"}`} />
      <div className="flex-1 min-w-0">
        {result.success ? (
          <>
            <div className="text-sm font-semibold text-blue-300 mb-1">EDA Playground opened</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {result.clipboardCopied
                ? "Design + testbench copied to clipboard. Paste into EDA Playground's left and right panels, then click Run."
                : "EDA Playground opened. Copy your code from the editor and paste it into the panels."}
            </div>
            {result.payload && (
              <div className="mt-2 text-xs text-slate-500">
                Simulator: <span className="text-slate-300">{result.payload.simulator}</span>
                {" · "}Language: <span className="text-slate-300">{result.payload.language}</span>
                {" · "}Module: <span className="text-slate-300">{result.payload.topModule}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-red-400">{result.error}</div>
        )}
      </div>
      <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-xl leading-none flex-shrink-0">×</button>
    </div>
  );
}

// ─── QuestaSim Panel ──────────────────────────────────────────────────────────

function QuestaSimPanel({ problem, userCode }) {
  const [expanded, setExpanded] = useState(false);
  const [questaStatus, setQuestaStatus] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [showTcl, setShowTcl] = useState(false);
  const [showTb, setShowTb] = useState(false);
  const [copied, setCopied] = useState("");
  const [storedPath, setStoredPath] = useState(null);

  useEffect(() => {
    checkQuestasimStatus().then(setQuestaStatus);
    const settings = getSettings();
    if (settings.questasim_path) setStoredPath(settings.questasim_path);
  }, []);

  const moduleName = (problem?.title || "vlsi_design").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  const simCmds = getSimulationCommands(moduleName, `${moduleName}.sv`, storedPath);
  const testbench = generateTestbench(moduleName, {
    inputs: [{ name: "clk" }, { name: "rst_n" }, { name: "data_in", width: 8 }],
    outputs: [{ name: "data_out", width: 8 }, { name: "valid" }],
    clock: true, reset: true,
  });
  const tclScript = generateTclScript({
    topModule: moduleName,
    codeFiles: [`${moduleName}.sv`, `tb_${moduleName}.sv`],
    runTime: "200ns",
  });

  const copyText = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const handleRun = async () => {
    setSimRunning(true);
    setSimResult(null);
    const result = await runInQuestasim({ code: userCode, testbench, topModule: moduleName });
    setSimResult(result);
    setSimRunning(false);
  };

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-800/50 hover:bg-slate-700/30 border-b border-slate-700 transition-colors">
        <Terminal className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-slate-200 flex-1 text-left">QuestaSim Integration</span>
        {questaStatus?.available
          ? <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Active</span>
          : storedPath
            ? <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Path Set</span>
            : <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Not Detected</span>}
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-4 bg-[#1a2235]">
          {questaStatus?.webMode && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300 leading-relaxed">
                {storedPath ? `Using configured path: ${storedPath}` : "QuestaSim not detected. Configure your vsim path in Settings, or use EDA Playground."}
              </div>
            </div>
          )}

          {questaStatus?.available && (
            <button onClick={handleRun} disabled={simRunning || !userCode}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60">
              {simRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {simRunning ? "Simulating..." : "Run in QuestaSim"}
            </button>
          )}

          {simResult && (
            <div className={`rounded-xl border px-4 py-3 ${simResult.passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className={`text-sm font-semibold mb-1 ${simResult.passed ? "text-green-400" : "text-red-400"}`}>
                {simResult.passed ? "✅ Simulation Passed" : "❌ Simulation Errors"}
              </div>
              {(simResult.errors || []).map((e, i) => (
                <div key={i} className="text-xs font-mono text-red-400 bg-red-500/10 px-3 py-1.5 rounded mb-1">{e}</div>
              ))}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Simulation Commands</div>
            <div className="bg-gray-900 rounded-xl p-4 relative">
              <button onClick={() => copyText(simCmds.full, "cmds")} className="absolute top-3 right-3 flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                <Copy className="w-3 h-3" />{copied === "cmds" ? "Copied!" : "Copy all"}
              </button>
              <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap leading-relaxed pr-16">{simCmds.full}</pre>
            </div>
          </div>

          <div>
            <button onClick={() => setShowTb(!showTb)} className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
              {showTb ? "▼" : "▶"} Auto-generated Testbench
            </button>
            {showTb && (
              <div className="bg-gray-900 rounded-xl p-4 relative">
                <button onClick={() => copyText(testbench, "tb")} className="absolute top-3 right-3 flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                  <Copy className="w-3 h-3" />{copied === "tb" ? "Copied!" : "Copy"}
                </button>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-auto pr-16">{testbench}</pre>
              </div>
            )}
          </div>

          <div>
            <button onClick={() => setShowTcl(!showTcl)} className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-2">
              {showTcl ? "▼" : "▶"} Tcl Simulation Script
            </button>
            {showTcl && (
              <div className="bg-gray-900 rounded-xl p-4 relative">
                <button onClick={() => copyText(tclScript, "tcl")} className="absolute top-3 right-3 flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                  <Copy className="w-3 h-3" />{copied === "tcl" ? "Copied!" : "Copy"}
                </button>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap pr-16">{tclScript}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CodingPage() {
  const {
    codingTask, editorCode: savedCode, selectedTopic: savedTopic,
    selectedTool: savedTool, simulationLogs: savedLogs, simAnalysis: savedAnalysis,
    restoreCodingState,
    setCodingTask, setEditorCode, setSelectedTopic, setSelectedTool,
    setSimulationLogs, setSimAnalysis,
  } = useActiveSessionStore();

  const [topicId, setTopicId] = useState(
    () => savedTopic || TOPICS.find((t) => t.track === "design" && t.order >= 12)?.id || TOPICS[0]?.id,
  );
  const [difficulty, setDifficulty] = useState("intermediate");
  const [simTool, setSimTool] = useState(() => savedTool || "auto");
  const [simOutput, setSimOutput] = useState(() => savedLogs || "");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [problem, setProblem] = useState(() => codingTask);
  const [userCode, setUserCode] = useState(() => savedCode || "");
  const [showSolution, setShowSolution] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [simAnalysis, setSimAnalysisLocal] = useState(() => savedAnalysis || null);
  const [analyzingSim, setAnalyzingSim] = useState(false);
  const [edaOpening, setEdaOpening] = useState(false);
  const [edaResult, setEdaResult] = useState(null);
  const [questaAvailable, setQuestaAvailable] = useState(false);
  const [vivadoAvailable, setVivadoAvailable] = useState(false);
  const [startTime] = useState(Date.now());
  const { updateAnalytics } = useAnalyticsStore();

  useEffect(() => {
    restoreCodingState();
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("topic");
      if (t) setTopicId(t);
    }
    // Detect local simulators
    const settings = getSettings();
    import("@/services/questaService").then(({ detectQuesta }) => {
      detectQuesta(settings.questasim_path).then((s) => setQuestaAvailable(!!s?.available));
    });
    import("@/services/vivadoService").then(({ detectVivado }) => {
      detectVivado(settings.vivado_path).then((v) => setVivadoAvailable(!!v?.available));
    });
  }, []);

  useEffect(() => { if (userCode && problem) setEditorCode(userCode); }, [userCode]);
  useEffect(() => { if (topicId) setSelectedTopic(topicId); }, [topicId]);

  const topic = TOPICS.find((t) => t.id === topicId);

  const effectiveTool = resolveEffectiveTool({
    selectedTool: simTool,
    track: topic?.track || "design",
    vivadoAvailable,
    questaAvailable,
  });

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!topic) { setError("Select a topic"); return; }
    setError(""); setProblem(null); setUserCode(""); setShowSolution(false);
    setSubmitted(false); setEvalResult(null); setEdaResult(null); setSimAnalysisLocal(null);
    setLoading(true);
    try {
      const result = await generateCodingProblem(topic.title, topic.description, difficulty);
      if (!result.success || !result.problems?.length) {
        setError(result.error || "Failed to generate problem. Please try again.");
        return;
      }
      const p = result.problems[0];
      setProblem(p); setCodingTask(p); setUserCode(p.starterCode || "");
    } catch (e) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Run (static check) ───────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (!problem || !userCode.trim()) return;
    const hasModule = /module\s+\w+/.test(userCode);
    const hasEndmodule = /endmodule/.test(userCode);
    const syntaxOk = hasModule && hasEndmodule && (/always\s+/.test(userCode) || /assign\s+/.test(userCode));

    const runLog = [
      "[Check]",
      `Analyzing: ${problem.title || "design"}`,
      "",
      hasModule ? "  ✓ module declaration found" : "  ✗ missing module declaration",
      hasEndmodule ? "  ✓ endmodule found" : "  ✗ missing endmodule",
      syntaxOk ? "  ✓ behavioral block found" : "  ✗ no always/assign block",
      "",
      syntaxOk ? "PASS — basic syntax OK" : "FAIL — incomplete module structure",
    ].join("\n");

    setSimOutput(runLog);
    setSimulationLogs(runLog);
    setEvalResult({
      success: true, passed: syntaxOk, overallScore: syntaxOk ? 75 : 40,
      static: {
        passed: syntaxOk,
        summary: syntaxOk ? "Basic syntax structure looks correct" : "Missing required Verilog constructs",
        errors: syntaxOk ? [] : [{ message: "Incomplete module structure" }],
        warnings: [],
      },
      ai: null,
    });
  }, [problem, userCode]);

  // ── Simulate (local QuestaSim) ───────────────────────────────────────────────

  const handleSimulate = useCallback(async () => {
    if (!problem || !userCode.trim() || !questaAvailable) return;
    const moduleName = (problem.title || "vlsi_design").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    const tb = generateTestbench(moduleName, {
      inputs: [{ name: "clk" }, { name: "rst_n" }, { name: "data_in", width: 8 }],
      outputs: [{ name: "data_out", width: 8 }, { name: "valid" }],
      clock: true, reset: true,
    });
    const result = await runInQuestasim({ code: userCode, testbench: tb, topModule: moduleName });
    const logs = result.transcript || result.errors?.join("\n") || "";
    setSimOutput(logs);
    setSimulationLogs(logs);
  }, [problem, userCode, questaAvailable]);

  // ── Generate Waveform (AI diagnostic) ───────────────────────────────────────

  const handleGenerateWaveform = useCallback(async () => {
    if (!problem || !userCode.trim()) return;
    setAnalyzingSim(true); setSimAnalysisLocal(null);
    try {
      const result = await generateWaveformDiagnostic({
        challengeTitle: problem.title,
        problemStatement: problem.description,
        userRtl: userCode,
        testbench: problem.solution || undefined,
        simulationLog: simOutput || undefined,
        failureTimestamp: new Date().toISOString(),
        expectedOutput: problem.testCases?.map((tc) => tc.expectedOutput).join("\n") || undefined,
      });
      setSimAnalysisLocal(result); setSimAnalysis(result);
    } catch (e) {
      const r = { success: false, error: e.message, diagnostic: "" };
      setSimAnalysisLocal(r); setSimAnalysis(r);
    } finally {
      setAnalyzingSim(false);
    }
  }, [problem, userCode, simOutput]);

  // ── Open in EDA Playground ───────────────────────────────────────────────────

  const handleOpenEDA = useCallback(async () => {
    if (!problem || !userCode.trim()) return;
    setEdaOpening(true); setEdaResult(null);
    try {
      const track = topic?.track || "design";
      const language = track === "verification" ? "uvm" : "systemverilog";
      const simulator = getRecommendedSimulator(track, language);
      const moduleName = (problem.title || "vlsi_design").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      const testbench = generateTestbenchForEDA(moduleName, userCode, language);
      const result = await buildAndOpen({ userCode, testbench, moduleName, language, simulator, track, waveformEnabled: true });
      setEdaResult(result);
    } catch (e) {
      setEdaResult({ success: false, payload: null, clipboardCopied: false, error: e.message });
    } finally {
      setEdaOpening(false);
    }
  }, [problem, userCode, topic]);

  // ── Analyze pasted EDA output ────────────────────────────────────────────────

  const handleAnalyzePasted = useCallback(async (pasteText) => {
    if (!pasteText.trim()) return;
    setSimOutput(pasteText); setSimulationLogs(pasteText);
    setAnalyzingSim(true); setSimAnalysisLocal(null);
    try {
      const result = await generateWaveformDiagnostic({
        challengeTitle: problem?.title,
        problemStatement: problem?.description,
        userRtl: userCode,
        testbench: problem?.solution || undefined,
        simulationLog: pasteText,
        failureTimestamp: new Date().toISOString(),
        expectedOutput: problem?.testCases?.map((tc) => tc.expectedOutput).join("\n") || undefined,
      });
      setSimAnalysisLocal(result); setSimAnalysis(result);
    } catch (e) {
      const r = { success: false, error: e.message, diagnostic: "" };
      setSimAnalysisLocal(r); setSimAnalysis(r);
    } finally {
      setAnalyzingSim(false);
    }
  }, [problem, userCode]);

  // ── Analyze with AI (toolbar) ────────────────────────────────────────────────

  const handleAnalyzeAI = useCallback(async () => {
    if (!problem || !userCode.trim()) return;
    if (simOutput) await handleAnalyzePasted(simOutput);
    else await handleGenerateWaveform();
  }, [problem, userCode, simOutput, handleAnalyzePasted, handleGenerateWaveform]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!problem || !userCode.trim()) return;
    setSubmitted(true); setEvaluating(true); setEvalResult(null);
    try {
      saveCodingSolution({
        topicId, title: problem.title, description: problem.description,
        difficulty: problem.difficulty, starterCode: problem.starterCode,
        solution: problem.solution, userCode,
        timeSpentSeconds: Math.round((Date.now() - startTime) / 1000),
      });
      await updateAnalytics({ codingProblems: 1 });
      handleRun();
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setEvaluating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-1">Coding Practice</h1>
          <p className="text-sm text-slate-400">AI-generated Verilog & SystemVerilog problems with EDA Playground integration</p>
        </div>

        {/* Controls */}
        <div className="bg-[#1a2235] border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Topic</label>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <optgroup label="Digital Design (Verilog focus)">
                  {TOPICS.filter((t) => t.track === "design").map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </optgroup>
                <optgroup label="Verification (SystemVerilog)">
                  {TOPICS.filter((t) => t.track === "verification").map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Simulation Tool</label>
              <select value={simTool} onChange={(e) => { setSimTool(e.target.value); setSelectedTool(e.target.value); }}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="auto">Auto-detect</option>
                <option value="vivado">Vivado (RTL Design)</option>
                <option value="questa">QuestaSim (Verification)</option>
                <option value="eda">EDA Playground (Cloud)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${difficulty === d ? DIFFICULTY_COLORS[d] : "border-slate-700 text-slate-400 hover:bg-slate-800/50"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate Problem"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!problem && !loading && (
          <div className="text-center py-20 bg-[#1a2235] border border-slate-700 rounded-xl">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-base font-medium text-slate-300 mb-2">Ready to Practice</div>
            <div className="text-sm text-slate-400">Select a topic and click Generate Problem</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 bg-[#1a2235] border border-slate-700 rounded-xl">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
            <div className="text-sm font-medium text-slate-300">Generating Verilog problem...</div>
            <div className="text-xs text-slate-400 mt-1">This may take 15–30 seconds</div>
          </div>
        )}

        {/* Problem + Editor */}
        {problem && !loading && (
          <>
            <CodingToolbar
              problem={problem} userCode={userCode} effectiveTool={effectiveTool}
              questaAvailable={questaAvailable}
              onRun={handleRun} onSimulate={handleSimulate}
              onGenerateWaveform={handleGenerateWaveform} onOpenEDA={handleOpenEDA}
              onPasteEDA={() => setShowPasteModal((v) => !v)} onAnalyzeAI={handleAnalyzeAI}
              running={evaluating} simRunning={false} analyzingSim={analyzingSim}
              edaOpening={edaOpening} showPasteModal={showPasteModal}
            />

            {edaResult && (
              <div className="mb-4">
                <EDALaunchBanner result={edaResult} onDismiss={() => setEdaResult(null)} />
              </div>
            )}

            {simAnalysis && !showPasteModal && (
              <div className={`mb-4 rounded-xl border p-4 ${simAnalysis.success ? "bg-cyan-500/10 border-cyan-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <div className={`text-xs font-semibold mb-2 ${simAnalysis.success ? "text-cyan-400" : "text-red-400"}`}>AI Diagnostic Analysis</div>
                <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
                  {simAnalysis.success ? simAnalysis.diagnostic : simAnalysis.error}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left */}
              <div className="space-y-4">
                <div className="bg-[#1a2235] border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-100 text-sm">Problem Statement</span>
                    <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.intermediate}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="text-base font-bold text-slate-100 mb-3">{problem.title}</h2>
                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{problem.description}</div>
                  </div>
                </div>

                {problem.testCases?.length > 0 && (
                  <div className="bg-[#1a2235] border border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-700/50">
                      <span className="font-semibold text-slate-100 text-sm">Test Cases</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {(problem.testCases || []).map((tc, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs">
                          <div className="text-slate-400 mb-1">Input: <span className="text-slate-200">{tc.input}</span></div>
                          <div className="text-slate-400">Expected: <span className="text-green-400">{tc.expectedOutput}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulator panel */}
                {effectiveTool === "eda" ? (
                  <div className="bg-[#111827] border border-blue-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-slate-100">EDA Playground</h3>
                      <span className="ml-auto text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Cloud</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      {simTool === "auto" ? "No local simulator detected — EDA Playground selected automatically. " : "EDA Playground selected for cloud simulation. "}
                      Click <strong className="text-slate-300">Open in EDA Playground</strong> in the toolbar to copy your code and launch the simulator.
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div>1. Click <span className="text-blue-400 font-medium">Open in EDA Playground</span> in the toolbar</div>
                      <div>2. Paste code into EDA Playground panels (already in clipboard)</div>
                      <div>3. Select language & simulator, then click Run</div>
                      <div>4. Click <span className="text-amber-400 font-medium">Paste EDA Output</span> to analyze results with AI</div>
                    </div>
                  </div>
                ) : (
                  <QuestaSimPanel problem={problem} userCode={userCode} />
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {!submitted ? (
                    <button onClick={handleSubmit}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
                      <Play className="w-4 h-4" />Submit Solution
                    </button>
                  ) : evaluating ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold rounded-xl">
                      <RefreshCw className="w-4 h-4 animate-spin" />Evaluating...
                    </div>
                  ) : evalResult ? (
                    <div className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl border ${evalResult.passed ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                      {evalResult.passed
                        ? <><CheckCircle2 className="w-4 h-4" />Passed! Score: {evalResult.overallScore}/100</>
                        : <><AlertCircle className="w-4 h-4" />Not Passed — Score: {evalResult.overallScore}/100</>}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />Solution Submitted!
                    </div>
                  )}
                  <button onClick={() => setShowSolution(!showSolution)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors">
                    <Lightbulb className="w-4 h-4" />{showSolution ? "Hide" : "Show"} Solution
                  </button>
                </div>

                {evalResult && (
                  <div className={`rounded-xl border overflow-hidden ${evalResult.passed ? "border-green-500/30" : "border-red-500/30"}`}>
                    <div className={`px-5 py-3.5 border-b ${evalResult.passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <span className={`font-semibold text-sm ${evalResult.passed ? "text-green-400" : "text-red-400"}`}>
                        Validation Results — Score: {evalResult.overallScore}/100
                      </span>
                    </div>
                    <div className="p-5 space-y-3 bg-[#1a2235]">
                      {evalResult.static && (
                        <div>
                          <div className={`text-xs font-semibold mb-1 ${evalResult.static.passed ? "text-green-400" : "text-red-400"}`}>
                            {evalResult.static.passed ? "✓" : "✗"} Static Analysis
                          </div>
                          <div className="text-xs text-slate-400">{evalResult.static.summary}</div>
                          {evalResult.static.errors?.map((e, i) => (
                            <div key={i} className="text-xs text-red-400 mt-1 ml-3">• {e.message}</div>
                          ))}
                        </div>
                      )}
                      {!evalResult.ai && (
                        <div className="text-xs text-slate-500 italic">AI review unavailable — using static analysis only.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Editor */}
              <div className="space-y-4">
                <CodeEditor value={userCode} onChange={setUserCode} label="your-solution.sv" />
                {showSolution && problem.solution && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-300">Reference Solution</span>
                    </div>
                    <CodeEditor value={problem.solution} readOnly label="solution.sv" />
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Panel */}
            <div className="mt-4">
              <TerminalPanel
                logs={simOutput}
                compileLog={evalResult?.errors?.length ? undefined : undefined}
                simulationLog={simOutput}
                passFail={
                  simAnalysis?.success && simAnalysis?.diagnostic?.toLowerCase().includes("pass")
                    ? "pass"
                    : simAnalysis?.success && simAnalysis?.diagnostic?.toLowerCase().includes("fail")
                    ? "fail"
                    : evalResult?.passed === true
                    ? "pass"
                    : evalResult?.passed === false
                    ? "fail"
                    : null
                }
                waveformStatus={
                  simAnalysis?.success ? { generated: true } : null
                }
              />
            </div>
          </>
        )}
      </div>

      <EDAPasteModal
        open={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onAnalyze={handleAnalyzePasted}
        analyzing={analyzingSim}
        simAnalysis={simAnalysis}
        simOutput={simOutput}
      />

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
