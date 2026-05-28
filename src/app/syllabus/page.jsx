"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS, getTopicsByTrack, isTopicUnlocked } from "@/data/syllabusData";
import { useProgressStore } from "@/stores/progressStore";
import { Lock, CheckCircle2, Clock, ChevronRight } from "lucide-react";

export default function SyllabusPage() {
  const { progress, fetchProgress, getCompletedTopicIds, isTopicCompleted } =
    useProgressStore();
  const [selectedTrack, setSelectedTrack] = useState("design");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      await fetchProgress();
      setLoading(false);
    }
    loadData();
  }, []);

  const completedTopicIds = getCompletedTopicIds();
  const designTopics = getTopicsByTrack("design");
  const verificationTopics = getTopicsByTrack("verification");
  const currentTopics =
    selectedTrack === "design" ? designTopics : verificationTopics;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            style={{
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <style jsx global>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
            Learning Roadmap
          </h1>
          <p className="text-sm text-gray-500">
            Master VLSI Design and Verification systematically
          </p>
        </div>

        {/* Track Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setSelectedTrack("design")}
              className={`
                pb-3 border-b-2 font-medium text-sm transition-colors
                ${
                  selectedTrack === "design"
                    ? "border-blue-600 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }
              `}
            >
              <span>Digital Design Track</span>
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {designTopics.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedTrack("verification")}
              className={`
                pb-3 border-b-2 font-medium text-sm transition-colors
                ${
                  selectedTrack === "verification"
                    ? "border-blue-600 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }
              `}
            >
              <span>Verification Track</span>
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {verificationTopics.length}
              </span>
            </button>
          </div>
        </div>

        {/* Topic List */}
        <div className="space-y-3">
          {currentTopics.map((topic, index) => {
            const completed = isTopicCompleted(topic.id);
            const unlocked = isTopicUnlocked(topic.id, completedTopicIds);
            const topicProgress = progress.find((p) => p.topic_id === topic.id);

            return (
              <div
                key={topic.id}
                className={`
                  bg-white border rounded-xl p-5 transition-all
                  ${
                    unlocked
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-gray-100 bg-gray-50"
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Order Badge */}
                  <div
                    className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold
                    ${
                      completed
                        ? "bg-green-50 text-green-600"
                        : unlocked
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    }
                  `}
                  >
                    {topic.order}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3
                          className={`text-base font-semibold ${unlocked ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {topic.title}
                        </h3>
                        <p
                          className={`text-sm mt-1 ${unlocked ? "text-gray-600" : "text-gray-400"}`}
                        >
                          {topic.description}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {completed ? (
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs font-medium text-green-700 flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </div>
                      ) : !unlocked ? (
                        <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-500 flex-shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </div>
                      ) : topicProgress ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium text-blue-700 flex-shrink-0">
                          In Progress
                        </div>
                      ) : null}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {topic.estimatedHours}h
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        {topic.difficulty}
                      </span>
                      {topic.prerequisites.length > 0 && (
                        <span className="text-gray-400">
                          {topic.prerequisites.length} prerequisite
                          {topic.prerequisites.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Subtopics */}
                    {topic.subtopics.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Key Concepts:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.subtopics.slice(0, 4).map((subtopic, i) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-gray-600"
                            >
                              {subtopic}
                            </span>
                          ))}
                          {topic.subtopics.length > 4 && (
                            <span className="text-xs text-gray-400 px-2 py-1">
                              +{topic.subtopics.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {unlocked && !completed && (
                      <div className="flex items-center gap-2 mt-4">
                        <a
                          href={`/ai-explorer?topic=${topic.id}`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Start Learning
                          <ChevronRight className="w-4 h-4" />
                        </a>
                        <span className="text-gray-300">|</span>
                        <a
                          href={`/quiz?topic=${topic.id}`}
                          className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          Take Quiz
                        </a>
                        <span className="text-gray-300">|</span>
                        <a
                          href={`/flashcards?topic=${topic.id}`}
                          className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          Study Flashcards
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Track Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {selectedTrack === "design"
              ? "📐 Digital Design Track"
              : "✅ Verification Track"}
          </h3>
          <p className="text-sm text-gray-600">
            {selectedTrack === "design"
              ? "Master the fundamentals of digital logic design, from number systems to RTL coding. Complete all Design topics before starting Verification."
              : "Learn advanced verification methodologies including SystemVerilog, UVM, and constrained random testing. Prerequisites: Complete Design track fundamentals first."}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
