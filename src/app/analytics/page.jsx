"use client";

import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useProgressStore } from "@/stores/progressStore";
import { Flame, Clock, Brain, Layers, Code2, Target } from "lucide-react";

// GitHub-style heatmap
function ActivityHeatmap({ data }) {
  const today = new Date();
  const WEEKS = 26; // 6 months
  const DAYS = 7;

  // Build a map of date -> level
  const dateMap = useMemo(() => {
    const m = {};
    for (const d of data) {
      m[d.date] = d.count;
    }
    return m;
  }, [data]);

  // Generate grid: 26 weeks x 7 days, from oldest to newest
  const grid = useMemo(() => {
    const weeks = [];
    // Start from WEEKS*7 days ago, aligned to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS * DAYS - 1));
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    for (let w = 0; w < WEEKS; w++) {
      const week = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * DAYS + d);
        const dateStr = date.toISOString().split("T")[0];
        const minutes = dateMap[dateStr] || 0;
        const level =
          minutes === 0
            ? 0
            : minutes < 15
              ? 1
              : minutes < 30
                ? 2
                : minutes < 60
                  ? 3
                  : 4;
        week.push({
          date: dateStr,
          minutes,
          level,
          isToday: dateStr === today.toISOString().split("T")[0],
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [dateMap]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    grid.forEach((week, wi) => {
      const firstDay = week[0];
      if (!firstDay) return;
      const m = new Date(firstDay.date).getMonth();
      if (m !== lastMonth) {
        labels.push({
          weekIndex: wi,
          label: new Date(firstDay.date).toLocaleDateString("en-US", {
            month: "short",
          }),
        });
        lastMonth = m;
      }
    });
    return labels;
  }, [grid]);

  const CELL = 13;
  const GAP = 3;
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const levelColors = ["#1e293b", "#064e3b", "#047857", "#059669", "#10b981"];
  const [tooltip, setTooltip] = useState(null);

  return (
    <div>
      <div className="overflow-x-auto">
        <div style={{ position: "relative", display: "inline-block" }}>
          {/* Month labels */}
          <div style={{ display: "flex", marginLeft: 32, marginBottom: 4 }}>
            {grid.map((_, wi) => {
              const ml = monthLabels.find((l) => l.weekIndex === wi);
              return (
                <div
                  key={wi}
                  style={{
                    width: CELL + GAP,
                    flexShrink: 0,
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  {ml ? ml.label : ""}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {/* Day labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: GAP,
                marginRight: 4,
                paddingTop: 0,
              }}
            >
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  style={{
                    width: 28,
                    height: CELL,
                    fontSize: 10,
                    color: "#9CA3AF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  {i % 2 === 1 ? d.slice(0, 3) : ""}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div style={{ display: "flex", gap: GAP }}>
              {grid.map((week, wi) => (
                <div
                  key={wi}
                  style={{ display: "flex", flexDirection: "column", gap: GAP }}
                >
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 3,
                        backgroundColor: levelColors[cell.level],
                        cursor: "pointer",
                        outline: cell.isToday ? "2px solid #3B82F6" : "none",
                        outlineOffset: 1,
                        transition: "opacity 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({ cell, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              marginLeft: 32,
            }}
          >
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Less</span>
            {levelColors.map((c, i) => (
              <div
                key={i}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: c,
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 18,
            top: tooltip.y - 40,
            zIndex: 9999,
            background: "#1F2937",
            color: "#F9FAFB",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {tooltip.cell.minutes > 0
            ? `${tooltip.cell.minutes} min`
            : "No activity"}{" "}
          — {tooltip.cell.date}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, color, bgColor }) {
  return (
    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-100 tracking-tight">
            {value}
          </div>
          <div className="text-xs font-medium text-gray-400 mt-0.5">
            {label}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, label, color }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
      <h3 className="text-base font-semibold text-gray-100 mb-4">{label}</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max((d.value / max) * 112, d.value > 0 ? 4 : 0)}px`,
                backgroundColor: color,
                transition: "height 0.3s",
              }}
            />
            <div className="text-xs text-gray-400 w-full text-center truncate">
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { analytics, summary, fetchAnalytics, fetchSummary } =
    useAnalyticsStore();
  const { progress } = useProgressStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await Promise.all([fetchAnalytics(180), fetchSummary()]);
      setLoading(false);
    }
    load();
  }, []);

  const heatmapData = useMemo(
    () =>
      analytics.map((a) => ({
        date: a.date,
        count: a.study_minutes || 0,
      })),
    [analytics],
  );

  // Last 7 days bar chart
  const last7 = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = analytics.find((a) => a.date === dateStr);
      result.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: found?.study_minutes || 0,
      });
    }
    return result;
  }, [analytics]);

  const last7Quizzes = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = analytics.find((a) => a.date === dateStr);
      result.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: found?.quizzes_completed || 0,
      });
    }
    return result;
  }, [analytics]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <style
            jsx
            global
          >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppLayout>
    );
  }

  const totalStudyHours = Math.round((summary?.totalStudyMinutes || 0) / 60);
  const avgDailyMinutes =
    analytics.length > 0
      ? Math.round(
          analytics.reduce((s, a) => s + (a.study_minutes || 0), 0) /
            analytics.length,
        )
      : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-100 tracking-tight mb-1">
            Analytics
          </h1>
          <p className="text-sm text-gray-400">
            Track your learning consistency and progress over time
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={`${summary?.currentStreak || 0}d`}
            color="text-orange-400"
            bgColor="bg-orange-900/30"
          />
          <StatCard
            icon={Clock}
            label="Total Hours"
            value={`${totalStudyHours}h`}
            color="text-blue-400"
            bgColor="bg-blue-900/30"
          />
          <StatCard
            icon={Target}
            label="Sessions"
            value={summary?.totalSessions || 0}
            color="text-green-400"
            bgColor="bg-green-900/30"
          />
          <StatCard
            icon={Brain}
            label="Quizzes"
            value={summary?.totalQuizzes || 0}
            color="text-purple-400"
            bgColor="bg-purple-900/30"
          />
          <StatCard
            icon={Layers}
            label="Flashcards"
            value={summary?.totalFlashcards || 0}
            color="text-indigo-400"
            bgColor="bg-indigo-900/30"
          />
          <StatCard
            icon={Code2}
            label="Problems"
            value={summary?.totalCoding || 0}
            color="text-pink-400"
            bgColor="bg-pink-900/30"
          />
        </div>

        {/* Heatmap */}
        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-100">
              Study Activity (Last 6 Months)
            </h2>
            <span className="text-sm text-gray-400">
              Avg {avgDailyMinutes} min/day
            </span>
          </div>
          <ActivityHeatmap data={heatmapData} />
        </div>

        {/* Bar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <BarChart
            data={last7}
            label="Daily Study Minutes (Last 7 Days)"
            color="#3B82F6"
          />
          <BarChart
            data={last7Quizzes}
            label="Quizzes Taken (Last 7 Days)"
            color="#8B5CF6"
          />
        </div>

        {/* Topic Progress Table */}
        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-100 mb-4">
            Topic Progress
          </h2>
          {progress.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No topic progress yet. Start studying to see your progress here.
            </div>
          ) : (
            <div className="space-y-3">
              {progress.slice(0, 10).map((p) => (
                <div key={p.topic_id} className="flex items-center gap-4">
                  <div className="text-sm text-gray-300 w-48 truncate">
                    {p.topic_id}
                  </div>
                  <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 w-10 text-right">
                    {p.progress || 0}%
                  </div>
                  {p.completed && (
                    <span className="text-xs font-medium text-green-300 bg-green-900/30 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
