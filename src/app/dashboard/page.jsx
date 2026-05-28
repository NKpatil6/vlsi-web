"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Flame,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  Code2,
  Brain,
  Layers,
  ArrowRight,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useProgressStore } from "@/stores/progressStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { TOPICS, isTopicUnlocked } from "@/data/syllabusData";

function StatCard({ icon: Icon, label, value, color, bgColor, href }) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 mb-0.5">
            {label}
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {value}
          </div>
        </div>
        {href && <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
      </div>
    </div>
  );
  if (href) return <a href={href}>{content}</a>;
  return content;
}

function QuickAction({ icon: Icon, label, desc, href, color, bgColor }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 ${bgColor} border rounded-xl hover:opacity-90 transition-opacity`}
    >
      <div
        className={`w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
    </a>
  );
}

export default function DashboardPage() {
  const { progress, fetchProgress, getCompletedTopicIds } = useProgressStore();
  const { sessions, fetchSessions, getUpcomingSessions, getTodaySessions } =
    useSessionStore();
  const { summary, fetchSummary, fetchAnalytics } = useAnalyticsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([
        fetchProgress(),
        fetchSessions(),
        fetchAnalytics(30),
        fetchSummary(),
      ]);
      setLoading(false);
    }
    loadData();
  }, []);

  const upcomingSessions = getUpcomingSessions(4);
  const todaySessions = getTodaySessions();
  const completedTopicIds = getCompletedTopicIds();
  const totalTopics = TOPICS.length;
  const completionPct =
    totalTopics > 0
      ? Math.round((completedTopicIds.length / totalTopics) * 100)
      : 0;

  // Find next unlocked topic
  const nextTopic = TOPICS.find(
    (t) =>
      !completedTopicIds.includes(t.id) &&
      isTopicUnlocked(t.id, completedTopicIds),
  );

  // Design vs verification progress
  const designCompleted = TOPICS.filter(
    (t) => t.track === "design" && completedTopicIds.includes(t.id),
  ).length;
  const dvCompleted = TOPICS.filter(
    (t) => t.track === "verification" && completedTopicIds.includes(t.id),
  ).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-96">
          <div
            className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
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

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Your VLSI interview preparation overview
            </p>
          </div>
          {nextTopic && (
            <a
              href={"/ai-explorer?topic=" + nextTopic.id}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Brain className="w-4 h-4" />
              Continue: {nextTopic.title}
            </a>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard
            icon={Flame}
            label="Streak"
            value={
              summary?.currentStreak !== undefined
                ? summary.currentStreak + "d"
                : "0d"
            }
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard
            icon={Target}
            label="Topics"
            value={completedTopicIds.length + "/" + totalTopics}
            color="text-blue-600"
            bgColor="bg-blue-50"
            href="/syllabus"
          />
          <StatCard
            icon={Clock}
            label="Study Hours"
            value={Math.round((summary?.totalStudyMinutes || 0) / 60) + "h"}
            color="text-green-600"
            bgColor="bg-green-50"
            href="/analytics"
          />
          <StatCard
            icon={Brain}
            label="Quizzes"
            value={summary?.totalQuizzes || 0}
            color="text-purple-600"
            bgColor="bg-purple-50"
            href="/quiz"
          />
          <StatCard
            icon={Layers}
            label="Flashcards"
            value={summary?.totalFlashcards || 0}
            color="text-indigo-600"
            bgColor="bg-indigo-50"
            href="/flashcards"
          />
          <StatCard
            icon={Code2}
            label="Problems"
            value={summary?.totalCoding || 0}
            color="text-pink-600"
            bgColor="bg-pink-50"
            href="/coding"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress + Track Overview */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overall progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Learning Progress
                </h2>
                <span className="text-sm font-medium text-blue-600">
                  {completionPct}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-700"
                  style={{ width: completionPct + "%" }}
                />
              </div>

              {/* Track rows */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      Digital Design Track
                    </span>
                    <span className="font-semibold text-gray-900">
                      {designCompleted}/14
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: (designCompleted / 14) * 100 + "%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-purple-500" />
                      Verification Track
                    </span>
                    <span className="font-semibold text-gray-900">
                      {dvCompleted}/6
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: (dvCompleted / 6) * 100 + "%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <QuickAction
                  icon={Brain}
                  label="AI Explorer"
                  desc="Get AI explanations"
                  href={
                    nextTopic
                      ? "/ai-explorer?topic=" + nextTopic.id
                      : "/ai-explorer"
                  }
                  color="text-blue-600"
                  bgColor="bg-blue-50 border-blue-100"
                />
                <QuickAction
                  icon={Layers}
                  label="Take a Quiz"
                  desc="Test your knowledge"
                  href="/quiz"
                  color="text-purple-600"
                  bgColor="bg-purple-50 border-purple-100"
                />
                <QuickAction
                  icon={BookOpen}
                  label="Study Flashcards"
                  desc="Spaced repetition"
                  href="/flashcards"
                  color="text-indigo-600"
                  bgColor="bg-indigo-50 border-indigo-100"
                />
                <QuickAction
                  icon={Code2}
                  label="Practice Coding"
                  desc="Verilog problems"
                  href="/coding"
                  color="text-green-600"
                  bgColor="bg-green-50 border-green-100"
                />
              </div>
            </div>

            {/* Today's Focus */}
            {todaySessions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Today&apos;s Sessions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white p-4 rounded-xl border border-gray-200"
                    >
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                          {session.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full capitalize font-medium ${
                            session.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Upcoming Sessions + Next Topic */}
          <div className="space-y-4">
            {/* Next Topic */}
            {nextTopic && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Up Next
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {nextTopic.title}
                </h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                  {nextTopic.description}
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                    {nextTopic.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {nextTopic.estimatedHours}h estimated
                  </span>
                </div>
                <a
                  href={"/ai-explorer?topic=" + nextTopic.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Upcoming Sessions
                </h2>
                <a
                  href="/sessions"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </a>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">
                    No upcoming sessions
                  </p>
                  <a
                    href="/sessions"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Session
                  </a>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900 mb-1 leading-snug">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded-full capitalize">
                          {session.type}
                        </span>
                        <span>
                          {new Date(
                            session.scheduled_date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements teaser */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-gray-900">
                  Achievements
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Complete topics and quizzes to unlock badges
              </p>
              <a
                href="/achievements"
                className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
