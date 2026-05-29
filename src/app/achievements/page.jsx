"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getAchievements } from "@/lib/storage";
import {
  Trophy, Award, Star, Zap, Flame, Brain, Code2, Layers,
  CheckCircle2, Cpu, Clock, Lock,
} from "lucide-react";

const ICON_MAP = {
  award: Award, trophy: Trophy, brain: Brain, star: Star, flame: Flame,
  zap: Zap, layers: Layers, code: Code2, "check-circle": CheckCircle2,
  cpu: Cpu, "check-circle-2": CheckCircle2,
};

const CATEGORY_LABELS = {
  sessions: "Sessions", quizzes: "Quizzes", consistency: "Consistency",
  flashcards: "Flashcards", coding: "Coding", tracks: "Track Completion",
};

const CATEGORY_COLORS = {
  sessions:    { bg: "bg-blue-500/10",   icon: "text-blue-400",   badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  quizzes:     { bg: "bg-purple-500/10",  icon: "text-purple-400", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  consistency: { bg: "bg-orange-500/10",  icon: "text-orange-400", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  flashcards:  { bg: "bg-indigo-500/10",  icon: "text-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  coding:      { bg: "bg-pink-500/10",    icon: "text-pink-400",   badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  tracks:      { bg: "bg-green-500/10",   icon: "text-green-400",  badge: "bg-green-500/10 text-green-400 border-green-500/20" },
};

function AchievementCard({ achievement }) {
  const unlocked = achievement.unlocked;
  const Icon = ICON_MAP[achievement.icon] || Trophy;
  const colors = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.sessions;
  const progress = Math.min(100, achievement.threshold > 0 ? (achievement.current / achievement.threshold) * 100 : 0);

  return (
    <div className={`rounded-xl p-5 border transition-all ${unlocked ? "bg-[#1a2235] border-slate-600/50 shadow-lg" : "bg-[#111827] border-slate-700/30 opacity-75"}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${unlocked ? colors.bg : "bg-slate-700/50"}`}>
          {unlocked ? <Icon className={`w-6 h-6 ${colors.icon}`} /> : <Lock className="w-6 h-6 text-slate-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${unlocked ? "text-slate-100" : "text-slate-400"}`}>
              {achievement.name}
            </h3>
            {unlocked && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            {achievement.description}
          </p>
          {!unlocked && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{achievement.current}/{achievement.threshold}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium border ${colors.badge}`}>
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
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setAchievements(getAchievements());
    } catch (e) {
      setError("Failed to load achievements");
      console.error("Achievements load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const categories = ["all", ...new Set(achievements.map((a) => a.category).filter(Boolean))];

  const filtered = achievements
    .filter((a) => selectedCategory === "all" ? true : a.category === selectedCategory)
    .sort((a, b) => (a.unlocked && !b.unlocked ? -1 : (!a.unlocked && b.unlocked ? 1 : 0)));

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-1">Achievements</h1>
          <p className="text-sm text-slate-400">Track your milestones and accomplishments</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Summary Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-100 mb-1">
                {unlockedCount} <span className="text-base font-medium text-slate-400">/ {achievements.length}</span>
              </div>
              <div className="text-sm text-amber-300 font-medium">Achievements Unlocked</div>
              <div className="w-48 h-2 bg-amber-500/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }} />
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
              className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors capitalize ${selectedCategory === cat ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No achievements yet. Start studying to unlock them!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
