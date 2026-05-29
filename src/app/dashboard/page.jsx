"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import AppLayout from "@/components/AppLayout";
import {
  Flame, Trophy, Target, Clock, BookOpen, Code2,
  Brain, Layers, ArrowRight, Plus, CheckCircle2,
} from "lucide-react";
import { useProgressStore } from "@/stores/progressStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { TOPICS, isTopicUnlocked } from "@/data/syllabusData";

function StatCard({ icon: Icon, label, value, color, bgColor, href }) {
  const content = (
    <div className="bg-[#1a2235] rounded-xl border border-slate-700/50 p-5 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-400 mb-0.5">{label}</div>
          <div className="text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
        </div>
        {href && <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </div>
    </div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

function QuickAction({ icon: Icon, label, desc, href, color, bgColor }) {
  return (
    <Link to={href} className={`flex items-center gap-3 px-4 py-3 ${bgColor} border rounded-xl hover:opacity-90 transition-opacity`}>
      <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-500 ml-auto" />
    </Link>
  );
}

export default function DashboardPage() {
  const { fetchProgress, getCompletedTopicIds } = useProgressStore();
  const { fetchSessions, getUpcomingSessions, getTodaySessions } = useSessionStore();
  const { summary, fetchSummary, fetchAnalytics } = useAnalyticsStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      fetchProgress();
      fetchSessions();
      fetchAnalytics(30);
      fetchSummary();
    } catch (e) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const upcomingSessions = getUpcomingSessions(4);
  const todaySessions = getTodaySessions();
  const completedTopicIds = getCompletedTopicIds();
  const totalTopics = TOPICS.length;
  const completionPct = totalTopics > 0 ? Math.round((completedTopicIds.length / totalTopics) * 100) : 0;
  const nextTopic = TOPICS.find((t) => !completedTopicIds.includes(t.id) && isTopicUnlocked(t.id, completedTopicIds));
  const designCompleted = TOPICS.filter((t) => t.track === "design" && completedTopicIds.includes(t.id)).length;
  const dvCompleted = TOPICS.filter((t) => t.track === "verification" && completedTopicIds.includes(t.id)).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-96">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">{error}</div>}

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Your VLSI interview preparation overview</p>
          </div>
          {nextTopic && (
            <Link to={"/ai-explorer?topic=" + nextTopic.id} className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-xl hover:bg-cyan-700 transition-colors">
              <Brain className="w-4 h-4" /> Continue: {nextTopic.title}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Flame} label="Streak" value={(summary?.streak || 0) + "d"} color="text-orange-400" bgColor="bg-orange-500/10" />
          <StatCard icon={Target} label="Topics" value={completedTopicIds.length + "/" + totalTopics} color="text-cyan-400" bgColor="bg-cyan-500/10" href="/syllabus" />
          <StatCard icon={Clock} label="Study Hours" value={Math.round((summary?.total_study_minutes || 0) / 60) + "h"} color="text-green-400" bgColor="bg-green-500/10" href="/analytics" />
          <StatCard icon={Brain} label="Quizzes" value={summary?.total_quizzes_completed || 0} color="text-purple-400" bgColor="bg-purple-500/10" href="/quiz" />
          <StatCard icon={Layers} label="Flashcards" value={summary?.total_flashcards_reviewed || 0} color="text-indigo-400" bgColor="bg-indigo-500/10" href="/flashcards" />
          <StatCard icon={Code2} label="Problems" value={summary?.total_coding_problems || 0} color="text-pink-400" bgColor="bg-pink-500/10" href="/coding" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1a2235] rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-100">Learning Progress</h2>
                <span className="text-sm font-medium text-cyan-400">{completionPct}%</span>
              </div>
              <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: completionPct + "%" }} />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-300 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-400" /> Digital Design Track</span>
                    <span className="font-semibold text-slate-100">{designCompleted}/14</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: (designCompleted / 14) * 100 + "%" }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-300 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-purple-400" /> Verification Track</span>
                    <span className="font-semibold text-slate-100">{dvCompleted}/6</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: (dvCompleted / 6) * 100 + "%" }} /></div>
                </div>
              </div>
            </div>

            <div className="bg-[#1a2235] rounded-xl border border-slate-700/50 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <QuickAction icon={Brain} label="AI Explorer" desc="Get AI explanations" href={nextTopic ? "/ai-explorer?topic=" + nextTopic.id : "/ai-explorer"} color="text-blue-400" bgColor="bg-blue-500/10 border-blue-500/20" />
                <QuickAction icon={Layers} label="Take a Quiz" desc="Test your knowledge" href="/quiz" color="text-purple-400" bgColor="bg-purple-500/10 border-purple-500/20" />
                <QuickAction icon={BookOpen} label="Study Flashcards" desc="Spaced repetition" href="/flashcards" color="text-indigo-400" bgColor="bg-indigo-500/10 border-indigo-500/20" />
                <QuickAction icon={Code2} label="Practice Coding" desc="Verilog problems" href="/coding" color="text-green-400" bgColor="bg-green-500/10 border-green-500/20" />
              </div>
            </div>

            {todaySessions.length > 0 && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
                <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Today&apos;s Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todaySessions.map((s) => (
                    <div key={s.id} className="bg-[#1a2235] p-4 rounded-xl border border-slate-700/50">
                      <div className="text-sm font-semibold text-slate-100 mb-1">{s.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="bg-slate-700/50 px-2 py-0.5 rounded-full capitalize">{s.type}</span>
                        <span className={`px-2 py-0.5 rounded-full capitalize font-medium ${s.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {nextTopic && (
              <div className="bg-[#1a2235] rounded-xl border border-slate-700/50 p-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Up Next</div>
                <h3 className="text-base font-semibold text-slate-100 mb-1">{nextTopic.title}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{nextTopic.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">{nextTopic.difficulty}</span>
                  <span className="text-xs text-slate-400">{nextTopic.estimatedHours}h estimated</span>
                </div>
                <Link to={"/ai-explorer?topic=" + nextTopic.id} className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors">Start Learning <ArrowRight className="w-4 h-4" /></Link>
              </div>
            )}

            <div className="bg-[#1a2235] rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-100">Upcoming Sessions</h2>
                <Link to="/sessions" className="text-xs font-medium text-cyan-400 hover:text-cyan-300">View all</Link>
              </div>
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 mb-3">No upcoming sessions</p>
                  <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium"><Plus className="w-4 h-4" /> Create Session</Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingSessions.map((s) => (
                    <div key={s.id} className="p-3 border border-slate-700/30 rounded-lg hover:border-slate-600/50 transition-colors bg-slate-800/30">
                      <div className="text-sm font-medium text-slate-100 mb-1 leading-snug">{s.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded-full capitalize">{s.type}</span>
                        <span>{new Date(s.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5 text-amber-400" /><span className="text-sm font-semibold text-slate-100">Achievements</span></div>
              <p className="text-xs text-slate-400 mb-3">Complete topics and quizzes to unlock badges</p>
              <Link to="/achievements" className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 border border-amber-500/20 text-amber-400 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors">View All <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
