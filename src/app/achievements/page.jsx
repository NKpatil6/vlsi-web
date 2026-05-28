"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Trophy,
  Award,
  Star,
  Zap,
  Flame,
  Brain,
  Code2,
  Layers,
  CheckCircle2,
  Cpu,
  Clock,
  Lock,
} from "lucide-react";

const ICON_MAP = {
  award: Award,
  trophy: Trophy,
  brain: Brain,
  star: Star,
  flame: Flame,
  zap: Zap,
  layers: Layers,
  code: Code2,
  "check-circle": CheckCircle2,
  cpu: Cpu,
  "check-circle-2": CheckCircle2,
};

const CATEGORY_LABELS = {
  sessions: "Sessions",
  quizzes: "Quizzes",
  consistency: "Consistency",
  flashcards: "Flashcards",
  coding: "Coding",
  tracks: "Track Completion",
};

const CATEGORY_COLORS = {
  sessions: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  quizzes: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
  },
  consistency: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
  flashcards: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
  coding: {
    bg: "bg-pink-50",
    icon: "text-pink-600",
    badge: "bg-pink-100 text-pink-700",
  },
  tracks: {
    bg: "bg-green-50",
    icon: "text-green-600",
    badge: "bg-green-100 text-green-700",
  },
};

function AchievementCard({ achievement }) {
  const unlocked = !!achievement.unlocked_at;
  const Icon = ICON_MAP[achievement.icon_name] || Trophy;
  const colors =
    CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.sessions;
  const progress = Math.min(100, achievement.progress || 0);

  return (
    <div
      className={`bg-white border rounded-xl p-5 transition-all ${unlocked ? "border-gray-200 shadow-sm" : "border-gray-100 opacity-75"}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${unlocked ? colors.bg : "bg-gray-100"}`}
        >
          {unlocked ? (
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          ) : (
            <Lock className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`text-sm font-semibold ${unlocked ? "text-gray-900" : "text-gray-500"}`}
            >
              {achievement.title}
            </h3>
            {unlocked && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                <CheckCircle2 className="w-3 h-3" />
                Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            {achievement.description}
          </p>

          {!unlocked && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    backgroundColor:
                      colors.icon.replace("text-", "") || "#6366F1",
                  }}
                />
              </div>
            </div>
          )}

          {unlocked && achievement.unlocked_at && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
            </div>
          )}

          <span
            className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}
          >
            {CATEGORY_LABELS[achievement.category] || achievement.category}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/achievements");
        if (!res.ok) throw new Error("Failed to load achievements");
        const data = await res.json();
        setAchievements(data.achievements || []);
      } catch (e) {
        console.error("Achievements load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;
  const categories = [
    "all",
    ...new Set(achievements.map((a) => a.category).filter(Boolean)),
  ];

  const filtered = achievements
    .filter((a) =>
      selectedCategory === "all" ? true : a.category === selectedCategory,
    )
    .sort((a, b) => {
      if (a.unlocked_at && !b.unlocked_at) return -1;
      if (!a.unlocked_at && b.unlocked_at) return 1;
      return 0;
    });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
            Achievements
          </h1>
          <p className="text-sm text-gray-500">
            Track your milestones and accomplishments
          </p>
        </div>

        {/* Summary Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Trophy className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {unlockedCount}{" "}
                <span className="text-base font-medium text-gray-500">
                  / {achievements.length}
                </span>
              </div>
              <div className="text-sm text-gray-700 font-medium">
                Achievements Unlocked
              </div>
              <div className="w-48 h-2 bg-amber-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{
                    width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors capitalize ${
                selectedCategory === cat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
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
