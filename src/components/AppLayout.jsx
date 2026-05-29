"use client";

import { useState, useEffect } from "react";
import {
  Home,
  BookOpen,
  Calendar,
  Brain,
  Code2,
  Layers,
  BarChart3,
  Trophy,
  Settings as SettingsIcon,
  Menu,
  X,
  MessageSquare,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import ErrorBoundary from "@/components/ErrorBoundary";

const NAV = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Syllabus", href: "/syllabus", icon: BookOpen },
  { name: "Sessions", href: "/sessions", icon: Calendar },
  { name: "AI Explorer", href: "/ai-explorer", icon: Brain },
  { name: "Quiz", href: "/quiz", icon: Layers },
  { name: "Flashcards", href: "/flashcards", icon: CreditCard },
  { name: "Coding", href: "/coding", icon: Code2 },
  { name: "Interview", href: "/interview", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Achievements", href: "/achievements", icon: Trophy },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

// Legacy graphite/glassmorphism theme tokens
const C = {
  bg900: "#0a0e1a",
  bg800: "#0f172a",
  sidebarBg: "rgba(10,14,26,0.88)",
  topbarBg: "rgba(10,14,26,0.72)",
  border: "rgba(148,163,184,0.07)",
  textPrimary: "#e2e8f0",
  textSec: "#94a3b8",
  textMuted: "#64748b",
  cyan: "#7dd3fc",
  indigo: "#818cf8",
  activeBg: "rgba(125,211,252,0.10)",
  activeBorder: "rgba(125,211,252,0.20)",
  hoverBg: "rgba(255,255,255,0.04)",
  green: "#4ade80",
};

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const pageTitle =
    NAV.find((n) => n.href === currentPath)?.name || "VLSI Interview Tracker";

  function NavItem({ item, forMobile }) {
    const active = currentPath === item.href;
    const narrow = collapsed && !forMobile;
    return (
      <Link
        to={item.href}
        title={narrow ? item.name : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: narrow ? "10px 0" : "9px 14px",
          justifyContent: narrow ? "center" : "flex-start",
          borderRadius: 10,
          textDecoration: "none",
          fontSize: 13.5,
          fontWeight: active ? 600 : 400,
          color: active ? C.cyan : C.textSec,
          background: active ? C.activeBg : "transparent",
          border: `1px solid ${active ? C.activeBorder : "transparent"}`,
          transition: "all 0.14s ease",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = C.hoverBg;
            e.currentTarget.style.color = C.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C.textSec;
          }
        }}
      >
        <item.icon
          size={16}
          strokeWidth={active ? 2.2 : 1.7}
          style={{ flexShrink: 0, color: active ? C.cyan : C.textMuted }}
        />
        {!narrow && (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.name}
          </span>
        )}
      </Link>
    );
  }

  function SidebarInner({ forMobile = false }) {
    const narrow = collapsed && !forMobile;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 56,
            padding: "0 14px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            justifyContent: narrow ? "center" : "space-between",
            gap: 8,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: "linear-gradient(135deg,#7dd3fc,#818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Code2 size={15} color="#0a0e1a" strokeWidth={2.5} />
            </div>
            {!narrow && (
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: C.textPrimary,
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                }}
              >
                VLSI Tracker
              </span>
            )}
          </div>
          {/* Collapse toggle (desktop) / Close (mobile) */}
          {!forMobile ? (
            !narrow && (
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: "4px 6px",
                  cursor: "pointer",
                  color: C.textMuted,
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <ChevronLeft size={13} />
              </button>
            )
          ) : (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.textMuted,
                padding: 4,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {narrow && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "8px 0",
            }}
          >
            <button
              onClick={() => setCollapsed(false)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                padding: "4px 6px",
                cursor: "pointer",
                color: C.textMuted,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: "8px 6px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {NAV.map((item) => (
            <NavItem key={item.href} item={item} forMobile={forMobile} />
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${C.border}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 7,
            justifyContent: narrow ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: C.green,
              flexShrink: 0,
              boxShadow: `0 0 6px rgba(74,222,128,0.6)`,
            }}
          />
          {!narrow && (
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {(() => {
                try {
                  const s = JSON.parse(localStorage.getItem("vlsi_settings") || "{}");
                  return s.ai_provider === "gemini" ? "Gemini" : "Groq LLaMA";
                } catch { return "Groq LLaMA"; }
              })()}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: C.bg900,
        color: C.textPrimary,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          width: collapsed ? 60 : 240,
          flexShrink: 0,
          flexDirection: "column",
          background: C.sidebarBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: `1px solid ${C.border}`,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        <SidebarInner />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
        >
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
            }}
          />
          <aside
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 240,
              background: "rgba(10,14,26,0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <SidebarInner forMobile />
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 20px",
            flexShrink: 0,
            background: C.topbarBg,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: `1px solid ${C.border}`,
            zIndex: 10,
          }}
        >
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.textMuted,
              padding: 4,
              display: "flex",
            }}
          >
            <Menu size={20} />
          </button>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: C.textPrimary,
              letterSpacing: "-0.2px",
            }}
          >
            {pageTitle}
          </h1>
        </header>

        {/* Scrollable content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: C.bg900,
          }}
        >
          <ErrorBoundary fallbackLabel="This page">{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
