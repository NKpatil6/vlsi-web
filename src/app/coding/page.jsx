"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import { generateCodingProblem } from "@/ai/requestAI";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import {
  checkQuestasimStatus,
  runInQuestasim,
  generateTestbench,
  generateTclScript,
  getSimulationCommands,
} from "@/services/questasimService";
import {
  Code2,
  Play,
  ChevronRight,
  AlertCircle,
  Zap,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Lightbulb,
  Terminal,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"];
const DIFFICULTY_COLORS = {
  beginner: "text-green-700 bg-green-50 border-green-200",
  intermediate: "text-yellow-700 bg-yellow-50 border-yellow-200",
  advanced: "text-red-700 bg-red-50 border-red-200",
};

function CodeEditor({ value, onChange, readOnly = false, label }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      {label && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">{label}</span>
          {readOnly && (
            <span className="ml-auto text-xs text-gray-600">read-only</span>
          )}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className="w-full bg-gray-900 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none"
        style={{
          minHeight: 280,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.6,
        }}
      />
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
    // Load stored QuestaSim path from settings
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.questasim_path)
          setStoredPath(d.settings.questasim_path);
      })
      .catch(() => {});
  }, []);

  const moduleName = (problem?.title || "vlsi_design")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
  const simCmds = getSimulationCommands(
    moduleName,
    `${moduleName}.sv`,
    storedPath,
  );
  const testbench = generateTestbench(moduleName, {
    inputs: [{ name: "clk" }, { name: "rst_n" }, { name: "data_in", width: 8 }],
    outputs: [{ name: "data_out", width: 8 }, { name: "valid" }],
    clock: true,
    reset: true,
  });
  const tclScript = generateTclScript({
    topModule: moduleName,
    codeFiles: [`${moduleName}.sv`, `tb_${moduleName}.sv`],
    runTime: "200ns",
  });

  const copyText = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard)
      navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const handleRun = async () => {
    setSimRunning(true);
    setSimResult(null);
    const result = await runInQuestasim({
      code: userCode,
      testbench,
      topModule: moduleName,
    });
    setSimResult(result);
    setSimRunning(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
      >
        <Terminal className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">
          QuestaSim Integration
        </span>
        {questaStatus?.available ? (
          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            Desktop Active
          </span>
        ) : storedPath ? (
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            Path Configured
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            Web — Commands Available
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-5 space-y-4 bg-white">
          {questaStatus?.webMode && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-800 mb-1">
                  {storedPath
                    ? "QuestaSim Path Configured"
                    : "Web Mode — Local Simulation"}
                </div>
                <div className="text-xs text-amber-700 leading-relaxed">
                  {storedPath ? (
                    `Using: ${storedPath} — Commands below use your configured path. Convert to EXE to run directly.`
                  ) : (
                    <>
                      Direct QuestaSim execution requires the EXE build.
                      <a
                        href="/settings"
                        style={{ color: "#d97706", fontWeight: 600 }}
                      >
                        Set your vsim.exe path in Settings
                      </a>
                      to personalize the commands below.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {questaStatus?.available && (
            <button
              onClick={handleRun}
              disabled={simRunning || !userCode}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60"
            >
              {simRunning ? (
                <RefreshCw
                  className="w-4 h-4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {simRunning ? "Simulating..." : "Run in QuestaSim"}
            </button>
          )}

          {simResult && (
            <div
              className={`rounded-xl border px-4 py-3 ${simResult.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              <div
                className={`text-sm font-semibold mb-1 ${simResult.passed ? "text-green-800" : "text-red-800"}`}
              >
                {simResult.passed
                  ? "✅ Simulation Passed"
                  : "❌ Simulation Errors"}
              </div>
              {(simResult.errors || []).map((e, i) => (
                <div
                  key={i}
                  className="text-xs font-mono text-red-700 bg-red-100 px-3 py-1.5 rounded mb-1"
                >
                  {e}
                </div>
              ))}
              {(simResult.webModeGuidance || []).map((g, i) => (
                <div
                  key={i}
                  className="text-xs text-amber-700 flex items-center gap-1.5 mt-1"
                >
                  <span className="text-amber-500">→</span>
                  {g}
                </div>
              ))}
            </div>
          )}

          {/* CLI Commands */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Simulation Commands
            </div>
            <div className="bg-gray-900 rounded-xl p-4 relative">
              <button
                onClick={() => copyText(simCmds.full, "cmds")}
                className="absolute top-3 right-3 flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                <Copy className="w-3 h-3" />
                {copied === "cmds" ? "Copied!" : "Copy all"}
              </button>
              <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap leading-relaxed pr-16">
                {simCmds.full}
              </pre>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowTb(!showTb)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
            >
              {showTb ? "▼" : "▶"} Auto-generated Testbench
            </button>
            {showTb && (
              <div className="bg-gray-900 rounded-xl p-4 relative">
                <button
                  onClick={() => copyText(testbench, "tb")}
                  className="absolute top-3 right-3 flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                  {copied === "tb" ? "Copied!" : "Copy"}
                </button>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-auto pr-16">
                  {testbench}
                </pre>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowTcl(!showTcl)}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2"
            >
              {showTcl ? "▼" : "▶"} Tcl Simulation Script
            </button>
            {showTcl && (
              <div className="bg-gray-900 rounded-xl p-4 relative">
                <button
                  onClick={() => copyText(tclScript, "tcl")}
                  className="absolute top-3 right-3 flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                  {copied === "tcl" ? "Copied!" : "Copy"}
                </button>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap pr-16">
                  {tclScript}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CodingPage() {
  const [topicId, setTopicId] = useState(
    TOPICS.find((t) => t.track === "design" && t.order >= 12)?.id ||
      TOPICS[0]?.id,
  );
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [problem, setProblem] = useState(null);
  const [userCode, setUserCode] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const { updateAnalytics } = useAnalyticsStore();

  // URL param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t) setTopicId(t);
    }
  }, []);

  const topic = TOPICS.find((t) => t.id === topicId);

  const handleGenerate = async () => {
    if (!topic) {
      setError("Select a topic");
      return;
    }
    setError("");
    setProblem(null);
    setUserCode("");
    setShowSolution(false);
    setSubmitted(false);
    setLoading(true);

    try {
      const result = await generateCodingProblem(
        topic.title,
        topic.description,
        difficulty,
      );
      if (!result.success || !result.problems || result.problems.length === 0) {
        setError(
          result.error || "Failed to generate problem. Please try again.",
        );
        return;
      }
      const p = result.problems[0];
      setProblem(p);
      setUserCode(p.starterCode || "");
    } catch (e) {
      setError("An error occurred. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || !userCode.trim()) return;
    setSubmitted(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    try {
      // Save solution
      const res = await fetch("/api/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          starterCode: problem.starterCode,
          solution: problem.solution,
          userCode,
          timeSpentSeconds: timeSpent,
        }),
      });
      if (res.ok) {
        await updateAnalytics({ codingProblems: 1 });
      }
    } catch (e) {
      console.error("Submit error:", e);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
            Coding Practice
          </h1>
          <p className="text-sm text-gray-500">
            AI-generated Verilog & SystemVerilog problems for interview prep
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Digital Design (Verilog focus)">
                  {TOPICS.filter((t) => t.track === "design").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Verification (SystemVerilog)">
                  {TOPICS.filter((t) => t.track === "verification").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Difficulty
              </label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                      difficulty === d
                        ? DIFFICULTY_COLORS[d]
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <RefreshCw
                  className="w-4 h-4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {loading ? "Generating..." : "Generate Problem"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Problem + Editor */}
        {!problem && !loading && (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-base font-medium text-gray-700 mb-2">
              Ready to Practice
            </div>
            <div className="text-sm text-gray-500">
              Select a topic and click Generate Problem
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
            <div
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div className="text-sm font-medium text-gray-700">
              Generating Verilog problem...
            </div>
            <div className="text-xs text-gray-500 mt-1">
              This may take 15–30 seconds
            </div>
          </div>
        )}

        {problem && !loading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Problem Statement */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-900 text-sm">
                    Problem Statement
                  </span>
                  <span
                    className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.intermediate}`}
                  >
                    {problem.difficulty}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">
                    {problem.title}
                  </h2>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {problem.description}
                  </div>
                </div>
              </div>

              {/* Test Cases */}
              {problem.testCases && problem.testCases.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <span className="font-semibold text-gray-900 text-sm">
                      Test Cases
                    </span>
                  </div>
                  <div className="p-5 space-y-3">
                    {problem.testCases.map((tc, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg p-3 font-mono text-xs"
                      >
                        <div className="text-gray-500 mb-1">
                          Input:{" "}
                          <span className="text-gray-800">{tc.input}</span>
                        </div>
                        <div className="text-gray-500">
                          Expected:{" "}
                          <span className="text-green-700">
                            {tc.expectedOutput}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── QuestaSim Panel ─── */}
              <QuestaSimPanel problem={problem} userCode={userCode} />

              {/* Actions */}
              <div className="flex gap-3">
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Submit Solution
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    Solution Submitted!
                  </div>
                )}
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showSolution ? "Hide" : "Show"} Solution
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="space-y-4">
              <CodeEditor
                value={userCode}
                onChange={setUserCode}
                label="your-solution.sv"
              />

              {showSolution && problem.solution && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      Reference Solution
                    </span>
                  </div>
                  <CodeEditor
                    value={problem.solution}
                    readOnly
                    label="solution.sv"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
