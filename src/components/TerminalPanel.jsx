"use client";

import { useState, useEffect, useRef } from "react";
import {
  Terminal, CheckCircle2, XCircle, Activity, Minimize2, Maximize2,
} from "lucide-react";

/**
 * Bottom-docked terminal panel for simulation output.
 * Shows compile logs, simulation logs, pass/fail status, and waveform info.
 */
export default function TerminalPanel({
  logs = "",
  compileLog = "",
  simulationLog = "",
  passFail = null, // "pass" | "fail" | null
  waveformStatus = null, // { generated: boolean, path?: string }
  visible = true,
  onToggle,
}) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, compileLog, simulationLog]);

  const hasContent = logs || compileLog || simulationLog;

  let displayContent = "";
  if (activeTab === "all") {
    const parts = [];
    if (compileLog) parts.push("[Compile]\n" + compileLog);
    if (simulationLog) parts.push("[Simulation]\n" + simulationLog);
    if (!parts.length && logs) parts.push(logs);
    displayContent = parts.join("\n\n");
  } else if (activeTab === "compile") {
    displayContent = compileLog || "(No compile output)";
  } else if (activeTab === "simulate") {
    displayContent = simulationLog || "(No simulation output)";
  }

  if (!visible) return null;

  return (
    <div data-testid="terminal-panel" className="border border-slate-700 rounded-xl overflow-hidden bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-slate-200 flex-1">
          Simulation Output
        </span>

        {passFail && (
          <span
            data-testid="pass-fail-badge"
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              passFail === "pass"
                ? "text-green-400 bg-green-500/10 border-green-500/20"
                : "text-red-400 bg-red-500/10 border-red-500/20"
            }`}
          >
            {passFail === "pass" ? (
              <><CheckCircle2 className="w-3 h-3" /> PASS</>
            ) : (
              <><XCircle className="w-3 h-3" /> FAIL</>
            )}
          </span>
        )}

        {waveformStatus && (
          <span
            data-testid="waveform-status"
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
              waveformStatus.generated
                ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <Activity className="w-3 h-3" />
            {waveformStatus.generated
              ? `Waveform: ${waveformStatus.path || "sim_output.vcd"}`
              : "Waveform Failed"}
          </span>
        )}

        <button
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onToggle?.(next);
          }}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-900/50 border-b border-slate-800">
            {[
              { key: "all", label: "All" },
              { key: "compile", label: "Compile" },
              { key: "simulate", label: "Simulation" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            data-testid="terminal-content"
            className="p-4 overflow-auto font-mono text-xs leading-relaxed"
            style={{ maxHeight: 320, minHeight: 120 }}
          >
            {hasContent ? (
              <pre className="text-green-300 whitespace-pre-wrap break-all">
                {displayContent}
              </pre>
            ) : (
              <div className="text-slate-500 text-center py-8">
                <Terminal className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <div>Run a simulation to see output here</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
