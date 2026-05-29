"use client";

/**
 * Settings — matches the original GitHub project's Settings.jsx structure.
 * Sections: AI Config (Groq key + model), QuestaSim Path, Session Settings, Data Management, About.
 * Dark graphite glassmorphism theme throughout.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import AppLayout from "@/components/AppLayout";
import {
  Key,
  Cpu,
  Bell,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Download,
  BookOpen,
  Zap,
  Save,
  Eye,
  EyeOff,
  Info,
  Clock,
  ChevronRight,
  Shield,
} from "lucide-react";
import { getSettings, saveSettings, resetAllData, exportAllData } from "@/lib/storage";

// ── Theme tokens ───────────────────────────────────────────────────────────
const C = {
  bg800: "#0f172a",
  bg700: "#1e293b",
  border: "rgba(148,163,184,0.08)",
  borderHi: "rgba(125,211,252,0.22)",
  textPri: "#e2e8f0",
  textSec: "#94a3b8",
  textMut: "#64748b",
  cyan: "#7dd3fc",
  indigo: "#818cf8",
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
  rose: "#fb7185",
};

// Groq models (matches original GitHub project's AI_MODELS + MODEL_DISPLAY_NAMES)
const AI_MODELS = {
  "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile — Best overall (Free)",
  "llama-3.1-8b-instant":
    "Llama 3.1 8B Instant — Ultra-fast, lightweight (Free)",
  "mixtral-8x7b-32768": "Mixtral 8x7B 32K — Large context window (Free)",
};

// ── Glass card wrapper ──────────────────────────────────────────────────────
function GlassCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, accent = C.cyan }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "16px 22px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          flexShrink: 0,
          background: `rgba(${accent === C.cyan ? "125,211,252" : accent === C.indigo ? "129,140,248" : accent === C.amber ? "251,191,36" : "248,113,113"},0.12)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={accent} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.textPri }}>
        {title}
      </span>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────
function Row({ label, hint, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "16px 22px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: C.textMut, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────
function DarkInput({
  value,
  onChange,
  type = "text",
  placeholder,
  mono = false,
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      style={{
        width: "100%",
        padding: "9px 13px",
        borderRadius: 9,
        background: "rgba(15,23,42,0.7)",
        border: `1px solid ${C.border}`,
        color: C.textPri,
        fontSize: 13,
        fontFamily: mono ? "'JetBrains Mono','Fira Code',monospace" : "inherit",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => (e.target.style.borderColor = C.borderHi)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  );
}

// ── Select ──────────────────────────────────────────────────────────────────
function DarkSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 13px",
        borderRadius: 9,
        background: "#1e293b",
        border: `1px solid ${C.border}`,
        color: C.textPri,
        fontSize: 13,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map(([val, label]) => (
        <option key={val} value={val} style={{ background: "#1e293b" }}>
          {label}
        </option>
      ))}
    </select>
  );
}

// ── Pill button ─────────────────────────────────────────────────────────────
function Pill({ onClick, disabled, children, color = C.cyan, danger = false }) {
  const bg = danger
    ? "rgba(248,113,113,0.15)"
    : `rgba(${color === C.cyan ? "125,211,252" : "129,140,248"},0.12)`;
  const fg = danger ? C.red : color;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: `1px solid ${fg}30`,
        background: bg,
        color: fg,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ ok, checking, label }) {
  const color = checking ? C.amber : ok ? C.green : C.red;
  const icon = checking ? "⏳" : ok ? "✓" : "✗";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: `rgba(${color === C.green ? "74,222,128" : color === C.red ? "248,113,113" : "251,191,36"},0.12)`,
        border: `1px solid ${color}40`,
        fontSize: 12,
        fontWeight: 600,
        color,
      }}
    >
      {icon} {label}
    </span>
  );
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? "rgba(125,211,252,0.3)" : "rgba(100,116,139,0.2)",
        border: `1px solid ${checked ? C.cyan + "60" : C.border}`,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked ? C.cyan : C.textMut,
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          transition: "left 0.2s ease",
          boxShadow: checked ? `0 0 6px ${C.cyan}60` : "none",
        }}
      />
    </button>
  );
}

// ── Reset confirm modal ──────────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel, loading }) {
  const [typed, setTyped] = useState("");
  const PHRASE = "RESET ALL DATA";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 440,
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(248,113,113,0.15)",
              border: "1px solid rgba(248,113,113,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={20} color={C.red} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textPri }}>
              Reset All Progress
            </div>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>
              Irreversible action
            </div>
          </div>
        </div>
        <div
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 18,
            fontSize: 12.5,
            color: "#fca5a5",
            lineHeight: 1.7,
          }}
        >
          This deletes all sessions, quizzes, flashcards, coding solutions,
          analytics, achievements, and topic progress.
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: C.textSec, marginBottom: 8 }}>
            Type{" "}
            <span
              style={{ fontFamily: "monospace", color: C.red, fontWeight: 700 }}
            >
              {PHRASE}
            </span>{" "}
            to confirm:
          </div>
          <DarkInput
            value={typed}
            onChange={setTyped}
            placeholder={PHRASE}
            mono
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.textSec,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={typed !== PHRASE || loading}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              background:
                typed === PHRASE
                  ? "rgba(248,113,113,0.25)"
                  : "rgba(248,113,113,0.08)",
              border: `1px solid ${typed === PHRASE ? C.red + "60" : C.border}`,
              color: typed === PHRASE ? C.red : C.textMut,
              fontSize: 13,
              fontWeight: 700,
              cursor: typed === PHRASE && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {loading ? (
              <RefreshCw
                size={13}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Trash2 size={13} />
            )}
            {loading ? "Resetting..." : "Reset Everything"}
          </button>
        </div>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Gemini models
const GEMINI_MODELS = {
  "gemini-2.0-flash": "Gemini 2.0 Flash — Fast, free tier",
  "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite — Lightweight, free tier",
  "gemini-1.5-pro": "Gemini 1.5 Pro — High capability",
};

// ── Main Settings Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  // AI provider
  const [aiProvider, setAiProvider] = useState("groq"); // "groq" | "gemini"

  // Groq
  const [groqKey, setGroqKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keySet, setKeySet] = useState(false);
  const [selModel, setSelModel] = useState("llama-3.3-70b-versatile");

  // Gemini
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiKeySet, setGeminiKeySet] = useState(false);
  const [selGeminiModel, setSelGeminiModel] = useState("gemini-2.0-flash");

  const [testingAI, setTestingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // null | 'ok' | 'err'
  const [aiMsg, setAiMsg] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  // QuestaSim
  const [questaPath, setQuestaPath] = useState("");
  const [questaStatus, setQuestaStatus] = useState(null); // null | 'ok' | 'err'
  const [questaMsg, setQuestaMsg] = useState("");
  const [checkingQ, setCheckingQ] = useState(false);
  const [savingQ, setSavingQ] = useState(false);

  // Vivado
  const [vivadoPath, setVivadoPath] = useState("");
  const [savingVivado, setSavingVivado] = useState(false);
  const [vivadoDetectResult, setVivadoDetectResult] = useState("");

  // Session settings
  const [dailyGoal, setDailyGoal] = useState("2");
  const [shiftMins, setShiftMins] = useState("0");
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // Data
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState(null);

  // Load settings on mount
  useEffect(() => {
    try {
      const s = getSettings();
      if (s.ai_provider) setAiProvider(s.ai_provider);
      if (s.groq_api_key) setKeySet(true);
      if (s.preferred_model) setSelModel(s.preferred_model);
      if (s.gemini_api_key) setGeminiKeySet(true);
      if (s.preferred_gemini_model) setSelGeminiModel(s.preferred_gemini_model);
      if (s.questasim_path) setQuestaPath(s.questasim_path);
      if (s.vivado_path) setVivadoPath(s.vivado_path);
      if (s.daily_study_goal) setDailyGoal(String(s.daily_study_goal));
      if (s.session_shift_minutes) setShiftMins(String(s.session_shift_minutes));
      if (s.sound_alerts !== undefined) setSoundAlerts(s.sound_alerts);
    } catch (e) {
      console.error("Settings load error:", e);
    }
  }, []);

  const showToast = useCallback((msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── AI handlers ────────────────────────────────────────────────────────────
  const handleSaveKey = () => {
    setSavingKey(true);
    try {
      const updates = {
        ai_provider: aiProvider,
        preferred_model: selModel,
        preferred_gemini_model: selGeminiModel,
      };
      if (groqKey.trim()) { updates.groq_api_key = groqKey.trim(); setKeySet(true); setGroqKey(""); }
      if (geminiKey.trim()) { updates.gemini_api_key = geminiKey.trim(); setGeminiKeySet(true); setGeminiKey(""); }
      saveSettings(updates);
      showToast("AI settings saved!");
    } catch {
      showToast("Failed to save AI settings", "err");
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    setAiStatus(null);
    try {
      const { requestAI } = await import("@/ai/requestAI");
      const data = await requestAI("Reply with exactly: VLSI_OK", { model: selModel });
      if (data.success) {
        setAiStatus("ok");
        setAiMsg(`Connected via ${data.model || selModel}`);
        showToast("AI connection successful!");
      } else {
        setAiStatus("err");
        setAiMsg(data.error || "Connection failed");
        showToast(data.error || "AI connection failed", "err");
      }
    } catch (e) {
      setAiStatus("err");
      setAiMsg(e.message);
      showToast("AI connection failed", "err");
    } finally {
      setTestingAI(false);
    }
  };

  // ── QuestaSim handlers ─────────────────────────────────────────────────────
  const handleSaveQuesta = () => {
    setSavingQ(true);
    try {
      saveSettings({ questasim_path: questaPath });
      showToast("QuestaSim path saved!");
    } catch {
      showToast("Failed to save QuestaSim path", "err");
    } finally {
      setSavingQ(false);
    }
  };

  const handleDetectQuesta = async () => {
    setCheckingQ(true);
    setQuestaStatus(null);
    // In Electron mode, try electronAPI; otherwise simulate common paths
    if (typeof window !== "undefined" && window?.electronAPI) {
      try {
        const status = await window.electronAPI.checkQuestasim();
        if (status?.available) {
          setQuestaPath(status.path || questaPath);
          setQuestaStatus("ok");
          setQuestaMsg(
            `Detected: ${status.version || "QuestaSim"} at ${status.path}`,
          );
          showToast("QuestaSim detected!");
        } else {
          setQuestaStatus("err");
          setQuestaMsg("QuestaSim not found. Enter path manually.");
        }
      } catch (e) {
        setQuestaStatus("err");
        setQuestaMsg(e.message || "Detection failed");
      }
    } else {
      // Web mode — just validate the saved path field isn't empty
      setTimeout(() => {
        if (questaPath.trim()) {
          setQuestaStatus("ok");
          setQuestaMsg("Path saved. Will be used when running as EXE.");
        } else {
          setQuestaStatus("err");
          setQuestaMsg("Enter the path to vsim.exe first.");
        }
        setCheckingQ(false);
      }, 600);
      return;
    }
    setCheckingQ(false);
  };

  // ── Vivado handlers ────────────────────────────────────────────────────────
  const handleSaveVivado = () => {
    setSavingVivado(true);
    try {
      saveSettings({ vivado_path: vivadoPath });
      showToast("Vivado path saved!");
    } catch {
      showToast("Failed to save Vivado path", "err");
    } finally {
      setSavingVivado(false);
    }
  };

  const handleDetectVivado = async () => {
    setVivadoDetectResult("");
    if (typeof window !== "undefined" && window?.electronAPI) {
      try {
        const status = await window.electronAPI.checkVivado();
        if (status?.available) {
          setVivadoPath(status.path || vivadoPath);
          setVivadoDetectResult(`Found: ${status.version || "Vivado"} at ${status.path}`);
          saveSettings({ vivado_path: status.path });
          showToast("Vivado detected!");
        } else {
          setVivadoDetectResult("Vivado not found. Enter path manually.");
        }
      } catch (e) {
        setVivadoDetectResult("Detection failed: " + (e.message || "Unknown error"));
      }
    } else {
      if (vivadoPath.trim()) {
        setVivadoDetectResult("Path saved. Will be used when running as EXE.");
      } else {
        setVivadoDetectResult("Enter the path to Vivado bin directory first.");
      }
    }
  };

  // ── Session settings save ──────────────────────────────────────────────────
  const handleSaveSession = () => {
    setSavingSession(true);
    try {
      saveSettings({
        daily_study_goal: dailyGoal,
        session_shift_minutes: shiftMins,
        sound_alerts: soundAlerts,
      });
      showToast("Session settings saved!");
    } catch {
      showToast("Failed to save", "err");
    } finally {
      setSavingSession(false);
    }
  };

  // ── Data reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setResetting(true);
    try {
      resetAllData();
      setShowReset(false);
      showToast("All data cleared. Reloading...");
      setTimeout(() => window.location.hash = "#/dashboard", 1500);
    } catch {
      showToast("Reset failed", "err");
    } finally {
      setResetting(false);
    }
  };

  // ── Export JSON ────────────────────────────────────────────────────────────
  const handleExport = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vlsi-tracker-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported!");
    } catch {
      showToast("Export failed", "err");
    }
  };

  const rowStyle = {
    padding: "13px 22px",
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: C.textPri };
  const hintStyle = { fontSize: 12, color: C.textMut, lineHeight: 1.5 };

  return (
    <AppLayout>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px 24px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: C.textPri,
              letterSpacing: "-0.4px",
              marginBottom: 5,
            }}
          >
            Settings
          </div>
          <div style={{ fontSize: 13.5, color: C.textMut }}>
            Configure AI, QuestaSim, and learning preferences
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 18px",
              borderRadius: 12,
              marginBottom: 20,
              background:
                toast.type === "err"
                  ? "rgba(248,113,113,0.12)"
                  : "rgba(74,222,128,0.12)",
              border: `1px solid ${toast.type === "err" ? C.red + "40" : C.green + "40"}`,
              fontSize: 13,
              color: toast.type === "err" ? C.red : C.green,
              fontWeight: 500,
            }}
          >
            {toast.type === "err" ? (
              <AlertCircle size={15} />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {toast.msg}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* ── 1. AI Configuration ──────────────────────────────────────── */}
          <GlassCard>
            <SectionHeader icon={Key} title="AI Configuration" accent={C.cyan} />

            {/* Provider selector */}
            <div style={rowStyle}>
              <div style={labelStyle}>AI Provider</div>
              <div style={hintStyle}>Select which AI service powers all generation features.</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["groq", "Groq (Llama)"], ["gemini", "Gemini (Google)"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setAiProvider(val)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 8,
                      border: `1px solid ${aiProvider === val ? C.cyan : C.border}`,
                      background: aiProvider === val ? "rgba(125,211,252,0.12)" : "rgba(15,23,42,0.5)",
                      color: aiProvider === val ? C.cyan : C.textSec,
                      fontSize: 13,
                      fontWeight: aiProvider === val ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Groq section ── */}
            <div style={rowStyle}>
              <div style={labelStyle}>
                Groq API Key
                {keySet && !groqKey && <span style={{ marginLeft: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>● Saved</span>}
              </div>
              <div style={hintStyle}>
                Free key at{" "}
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: C.cyan, textDecoration: "none" }}>
                  console.groq.com/keys →
                </a>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder={keySet ? "Enter new key to replace..." : "gsk_..."}
                    autoComplete="off"
                    style={{ width: "100%", padding: "9px 38px 9px 13px", borderRadius: 9, boxSizing: "border-box", background: "rgba(15,23,42,0.7)", border: `1px solid ${C.border}`, color: C.textPri, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = C.borderHi)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  <button onClick={() => setShowKey((s) => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMut, display: "flex" }}>
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Pill onClick={handleSaveKey} disabled={savingKey}>
                  {savingKey ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                  Save
                </Pill>
                <Pill onClick={handleTestAI} disabled={testingAI} color={C.indigo}>
                  {testingAI ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={13} />}
                  Test
                </Pill>
              </div>
              {aiMsg && <div style={{ fontSize: 12, color: aiStatus === "ok" ? C.green : C.red, marginTop: 2 }}>{aiMsg}</div>}
            </div>

            {/* Groq model */}
            <div style={rowStyle}>
              <div style={labelStyle}>Groq Model</div>
              <DarkSelect value={selModel} onChange={(v) => setSelModel(v)} options={Object.entries(AI_MODELS)} />
            </div>

            {/* ── Gemini section ── */}
            <div style={rowStyle}>
              <div style={labelStyle}>
                Gemini API Key
                {geminiKeySet && !geminiKey && <span style={{ marginLeft: 8, fontSize: 11, color: C.green, fontWeight: 600 }}>● Saved</span>}
              </div>
              <div style={hintStyle}>
                Free key at{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: C.cyan, textDecoration: "none" }}>
                  aistudio.google.com/app/apikey →
                </a>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={geminiKeySet ? "Enter new key to replace..." : "AIza..."}
                    autoComplete="off"
                    style={{ width: "100%", padding: "9px 38px 9px 13px", borderRadius: 9, boxSizing: "border-box", background: "rgba(15,23,42,0.7)", border: `1px solid ${C.border}`, color: C.textPri, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = C.borderHi)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  <button onClick={() => setShowGeminiKey((s) => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMut, display: "flex" }}>
                    {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Pill onClick={handleSaveKey} disabled={savingKey}>
                  {savingKey ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                  Save
                </Pill>
              </div>
            </div>

            {/* Gemini model */}
            <div style={rowStyle}>
              <div style={labelStyle}>Gemini Model</div>
              <DarkSelect value={selGeminiModel} onChange={(v) => setSelGeminiModel(v)} options={Object.entries(GEMINI_MODELS)} />
            </div>

            {/* Save all */}
            <div style={{ padding: "10px 22px", borderBottom: `1px solid ${C.border}` }}>
              <Pill onClick={handleSaveKey} disabled={savingKey}>
                {savingKey ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                Save All AI Settings
              </Pill>
            </div>
          </GlassCard>

          {/* ── 2. QuestaSim Configuration ─────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={Terminal}
              title="QuestaSim Configuration"
              accent={C.indigo}
            />

            <div style={rowStyle}>
              <div style={labelStyle}>QuestaSim Path (vsim.exe)</div>
              <div style={hintStyle}>
                Full path to your vsim.exe installation. Used for direct
                simulation in the EXE app.
                <br />
                Common paths:{" "}
                <span style={{ fontFamily: "monospace", color: C.textSec }}>
                  C:\questasim64_2024.1\win64\vsim.exe
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <DarkInput
                    value={questaPath}
                    onChange={setQuestaPath}
                    placeholder="C:\questasim64_2024.1\win64\vsim.exe"
                    mono
                  />
                </div>
                <Pill onClick={handleSaveQuesta} disabled={savingQ}>
                  {savingQ ? (
                    <RefreshCw
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Save size={13} />
                  )}
                  Save
                </Pill>
                <Pill
                  onClick={handleDetectQuesta}
                  disabled={checkingQ}
                  color={C.indigo}
                >
                  {checkingQ ? (
                    <RefreshCw
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Cpu size={13} />
                  )}
                  Auto-detect
                </Pill>
              </div>
              {questaStatus && (
                <div
                  style={{
                    fontSize: 12,
                    color: questaStatus === "ok" ? C.green : C.red,
                    marginTop: 2,
                  }}
                >
                  {questaMsg}
                </div>
              )}
            </div>

            {/* Common default paths */}
            <div
              style={{
                padding: "12px 22px",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: 12, color: C.textMut, marginBottom: 8 }}>
                Common installation paths (click to fill):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  "C:\\questasim64_2024.1\\win64\\vsim.exe",
                  "C:\\questasim64_2023.1\\win64\\vsim.exe",
                  "C:\\Questasim\\win64\\vsim.exe",
                  "C:\\ModelSim\\win64\\vsim.exe",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuestaPath(p)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 7,
                      background: "rgba(129,140,248,0.08)",
                      border: `1px solid rgba(129,140,248,0.2)`,
                      color: C.indigo,
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono',monospace",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.split("\\").slice(-3).join("\\")}
                  </button>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div style={{ padding: "12px 22px" }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "rgba(125,211,252,0.06)",
                  border: `1px solid rgba(125,211,252,0.12)`,
                }}
              >
                <Info
                  size={15}
                  color={C.cyan}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div
                  style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6 }}
                >
                  The Coding page will use this path when running as a Windows
                  EXE to compile and simulate your Verilog/SystemVerilog designs
                  directly in QuestaSim. Testbench generation and Tcl scripts
                  work in both web and EXE modes.
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── 2b. Vivado Configuration ──────────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={Cpu}
              title="Vivado Configuration"
              accent={C.cyan}
            />

            <div style={rowStyle}>
              <div style={labelStyle}>Vivado Installation Path</div>
              <div style={hintStyle}>
                Path to Vivado bin directory (e.g., C:\Xilinx\Vivado\2024.1\bin)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <DarkInput
                  value={vivadoPath}
                  onChange={setVivadoPath}
                  placeholder="C:\Xilinx\Vivado\2024.1\bin"
                  style={{ flex: 1 }}
                />
                <Pill onClick={handleSaveVivado} disabled={savingVivado} color={C.cyan}>
                  {savingVivado ? "Saving..." : "Save"}
                </Pill>
              </div>
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>Quick Detect</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill onClick={handleDetectVivado} color={C.green}>
                  <Terminal size={13} /> Auto-detect Vivado
                </Pill>
              </div>
              {vivadoDetectResult && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: vivadoDetectResult.includes("Found") ? C.green : C.amber,
                    padding: "6px 10px",
                    background: C.activeBg,
                    borderRadius: 6,
                  }}
                >
                  {vivadoDetectResult}
                </div>
              )}
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>Common Paths</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  "C:\\Xilinx\\Vivado\\2024.1\\bin",
                  "C:\\Xilinx\\Vivado\\2023.2\\bin",
                  "C:\\Xilinx\\Vivado\\2023.1\\bin",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setVivadoPath(p)}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: C.textSec,
                      background: "#0f172a",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.cyan)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.textSec)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: C.activeBg,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Info size={13} color={C.cyan} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.cyan }}>
                  Vivado RTL Simulation
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
                The Coding page uses Vivado for RTL design simulation (xvlog → xelab → xsim pipeline).
                Waveform VCD files are generated for analysis. If Vivado is not installed,
                the app falls back to EDA Playground cloud simulation.
              </div>
            </div>
          </GlassCard>

          {/* ── 3. Session Settings ─────────────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={Clock}
              title="Session Settings"
              accent={C.amber}
            />

            <div style={rowStyle}>
              <div style={labelStyle}>Daily Study Goal (hours)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(e.target.value)}
                  style={{ flex: 1, accentColor: C.cyan }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.cyan,
                    minWidth: 30,
                  }}
                >
                  {dailyGoal}h
                </span>
              </div>
            </div>

            <div style={rowStyle}>
              <div style={labelStyle}>Shift All Sessions</div>
              <div style={hintStyle}>
                Adjust scheduled time for all pending sessions
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Pill
                  onClick={() =>
                    setShiftMins(String(Math.max(0, Number(shiftMins) - 15)))
                  }
                  color={C.textSec}
                >
                  −15 min
                </Pill>
                <Pill
                  onClick={() => setShiftMins(String(Number(shiftMins) + 15))}
                >
                  +15 min
                </Pill>
                <Pill
                  onClick={() => setShiftMins(String(Number(shiftMins) + 30))}
                >
                  +30 min
                </Pill>
                <Pill onClick={() => setShiftMins("0")} color={C.textMut}>
                  Reset
                </Pill>
                <span style={{ fontSize: 12.5, color: C.textSec }}>
                  Current offset:{" "}
                  <strong style={{ color: C.cyan }}>{shiftMins} min</strong>
                </span>
              </div>
            </div>

            <div
              style={{
                ...rowStyle,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={labelStyle}>Sound Alerts</div>
                <div style={hintStyle}>Play a sound when a session is due</div>
              </div>
              <Toggle checked={soundAlerts} onChange={setSoundAlerts} />
            </div>

            <div style={{ padding: "12px 22px" }}>
              <Pill onClick={handleSaveSession} disabled={savingSession}>
                {savingSession ? (
                  <RefreshCw
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Save size={13} />
                )}
                Save Session Settings
              </Pill>
            </div>
          </GlassCard>

          {/* ── 4. Data Management ──────────────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={Database}
              title="Data Management"
              accent={C.textSec}
            />

            <div
              style={{
                ...rowStyle,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={labelStyle}>Export Data</div>
                <div style={hintStyle}>
                  Download all sessions, progress, and analytics as JSON
                </div>
              </div>
              <Pill onClick={handleExport} color={C.indigo}>
                <Download size={13} /> Export JSON
              </Pill>
            </div>

            <div
              style={{
                ...rowStyle,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={labelStyle}>Navigation</div>
                <div style={hintStyle}>Quick links to all modules</div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                gap: 1,
                background: C.border,
                margin: "0 22px 16px",
              }}
            >
              {[
                { label: "Dashboard", href: "#/dashboard" },
                { label: "Syllabus", href: "#/syllabus" },
                { label: "Sessions", href: "#/sessions" },
                { label: "AI Explorer", href: "#/ai-explorer" },
                { label: "Quiz", href: "#/quiz" },
                { label: "Flashcards", href: "#/flashcards" },
                { label: "Coding", href: "#/coding" },
                { label: "Analytics", href: "#/analytics" },
                { label: "Achievements", href: "#/achievements" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#0f172a",
                    textDecoration: "none",
                    fontSize: 13,
                    color: C.textSec,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = C.cyan;
                    e.currentTarget.style.background = C.activeBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = C.textSec;
                    e.currentTarget.style.background = "#0f172a";
                  }}
                >
                  {item.label}
                  <ChevronRight size={13} />
                </a>
              ))}
            </div>

            {/* Danger zone */}
            <div
              style={{
                margin: "0 22px 20px",
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.18)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.red,
                  marginBottom: 6,
                }}
              >
                Danger Zone
              </div>
              <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 14 }}>
                Permanently deletes all sessions, quizzes, flashcards,
                analytics, achievements, and progress. Cannot be undone.
              </div>
              <Pill onClick={() => setShowReset(true)} danger>
                <Trash2 size={13} /> Reset All Progress
              </Pill>
            </div>
          </GlassCard>

          {/* ── 5. About ─────────────────────────────────────────────────── */}
          <GlassCard>
            <SectionHeader icon={Info} title="About" accent={C.textMut} />
            <div
              style={{
                padding: "16px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                ["Application", "VLSI Interview Tracker"],
                ["AI Providers", "Groq (Llama) · Gemini (Google)"],
                ["Simulation", "Vivado · QuestaSim · EDA Playground"],
                ["Design Topics", "14 (Number Systems → Timing)"],
                ["Verification Topics", "6 (Fundamentals → UVM)"],
                ["Platform", "Web + Windows EXE (Electron)"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    borderBottom: `1px solid ${C.border}`,
                    paddingBottom: 8,
                  }}
                >
                  <span style={{ color: C.textMut }}>{k}</span>
                  <span style={{ color: C.textPri, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {showReset && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
          loading={resetting}
        />
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.4); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.6); }
      `}</style>
    </AppLayout>
  );
}
