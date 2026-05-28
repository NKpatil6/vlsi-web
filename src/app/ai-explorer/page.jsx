"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import {
  generateExplanation,
  generateStudyPlan,
  generateInterviewQuestions,
} from "@/ai/requestAI";
import { useProgressStore } from "@/stores/progressStore";
import {
  Brain,
  BookOpen,
  Map,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Clock,
} from "lucide-react";

const MODES = [
  {
    id: "explain",
    label: "Explain Topic",
    icon: BookOpen,
    desc: "Deep dive into any concept",
  },
  {
    id: "interview",
    label: "Interview Prep",
    icon: MessageSquare,
    desc: "Real interview questions",
  },
  {
    id: "studyplan",
    label: "Study Plan",
    icon: Map,
    desc: "Personalized learning path",
  },
];

function MarkdownBlock({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return (
            <h2
              key={i}
              className="text-base font-semibold text-gray-900 mt-4 mb-2"
            >
              {line.slice(3)}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">
              {line.slice(2)}
            </h1>
          );
        if (line.startsWith("### "))
          return (
            <h3
              key={i}
              className="text-sm font-semibold text-gray-800 mt-3 mb-1"
            >
              {line.slice(4)}
            </h3>
          );
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex items-start gap-2 my-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
              <span className="text-sm text-gray-700">{line.slice(2)}</span>
            </div>
          );
        if (line.startsWith("**") && line.endsWith("**"))
          return (
            <div key={i} className="font-semibold text-sm text-gray-900 my-1">
              {line.slice(2, -2)}
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return (
          <p key={i} className="text-sm text-gray-700 my-1 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function AIExplorerPage() {
  const [mode, setMode] = useState("explain");
  const [topicId, setTopicId] = useState(TOPICS[0]?.id || "");
  const [concept, setConcept] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const { updateProgress } = useProgressStore();

  // URL param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t && TOPICS.find((x) => x.id === t)) setTopicId(t);
    }
  }, []);

  const topic = TOPICS.find((t) => t.id === topicId);

  const handleGenerate = async () => {
    if (!topic) {
      setError("Please select a topic");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);

    try {
      if (mode === "explain") {
        const res = await generateExplanation(
          topic.title,
          concept || topic.description,
          topic.description,
        );
        if (!res.success) throw new Error(res.error || "Generation failed");
        setResult({ type: "explain", data: res.explanation });

        // Mark topic as accessed
        updateProgress(topicId, {
          lastAccessedAt: new Date().toISOString(),
        }).catch(() => {});
      } else if (mode === "interview") {
        const res = await generateInterviewQuestions(topic.title, 5);
        if (!res.success) throw new Error(res.error || "Generation failed");
        setResult({ type: "interview", data: res.questions });
      } else if (mode === "studyplan") {
        const res = await generateStudyPlan(topic.title, hoursPerDay);
        if (!res.success) throw new Error(res.error || "Generation failed");
        setResult({ type: "studyplan", data: res.plan });
      }
    } catch (e) {
      setError(e.message || "Failed to generate content. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
            AI Explorer
          </h1>
          <p className="text-sm text-gray-500">
            AI-powered learning tools for VLSI interview prep
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 sticky top-6">
              {/* Mode Selection */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Mode
                </div>
                <div className="space-y-2">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMode(m.id);
                        setResult(null);
                        setError("");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                        mode === m.id
                          ? "bg-blue-50 text-blue-900 border border-blue-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <m.icon
                        className={`w-4 h-4 flex-shrink-0 ${mode === m.id ? "text-blue-600" : "text-gray-400"}`}
                      />
                      <div>
                        <div className="font-medium">{m.label}</div>
                        <div className="text-xs text-gray-500">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Topic
                </label>
                <select
                  value={topicId}
                  onChange={(e) => {
                    setTopicId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Digital Design">
                    {TOPICS.filter((t) => t.track === "design").map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Verification">
                    {TOPICS.filter((t) => t.track === "verification").map(
                      (t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ),
                    )}
                  </optgroup>
                </select>
              </div>

              {/* Mode-specific options */}
              {mode === "explain" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Specific Concept (optional)
                  </label>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="e.g., Setup time violation"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {mode === "studyplan" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Hours per Day:{" "}
                    <span className="text-blue-600">{hoursPerDay}h</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {/* Topic Info */}
              {topic && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">
                    Selected Topic
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {topic.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {topic.difficulty}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {topic.estimatedHours}h
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-800 mb-1">
                    Generation Failed
                  </div>
                  <div className="text-sm text-red-700">{error}</div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <div
                  className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <div className="text-sm font-medium text-gray-700">
                  AI is generating content...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  This may take 10–30 seconds
                </div>
              </div>
            )}

            {!loading && !result && !error && (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-base font-medium text-gray-700 mb-2">
                  Ready to Generate
                </div>
                <div className="text-sm text-gray-500">
                  Select a topic and mode, then click Generate to get AI-powered
                  learning content.
                </div>
              </div>
            )}

            {!loading && result && (
              <>
                {/* Explanation Result */}
                {result.type === "explain" && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">
                        Explanation: {topic?.title}
                      </span>
                    </div>
                    <div className="p-6 space-y-5">
                      {/* Main explanation */}
                      {result.data && typeof result.data === "object" ? (
                        <>
                          <MarkdownBlock text={result.data.explanation || ""} />
                          {Array.isArray(result.data.keyPoints) &&
                            result.data.keyPoints.length > 0 && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
                                  Key Points
                                </div>
                                <ul className="space-y-2">
                                  {result.data.keyPoints.map((pt, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-blue-900"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                      {pt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {Array.isArray(result.data.examples) &&
                            result.data.examples.length > 0 && (
                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                                  Examples
                                </div>
                                <ul className="space-y-2">
                                  {result.data.examples.map((ex, i) => (
                                    <li
                                      key={i}
                                      className="text-sm text-gray-700 font-mono bg-white border border-gray-200 rounded-lg px-3 py-2"
                                    >
                                      {ex}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </>
                      ) : (
                        <MarkdownBlock
                          text={
                            typeof result.data === "string" ? result.data : ""
                          }
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Interview Questions Result */}
                {result.type === "interview" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">
                        {(result.data || []).length} Interview Questions —{" "}
                        {topic?.title}
                      </span>
                    </div>
                    {(result.data || []).map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-gray-100">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {idx + 1}. {q.question}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                {q.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  q.difficulty === "beginner"
                                    ? "bg-green-50 text-green-700"
                                    : q.difficulty === "advanced"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-yellow-50 text-yellow-700"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Expected Answer
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {q.expectedAnswer}
                            </div>
                          </div>
                          {q.tips && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                                💡 Interviewer Tip
                              </div>
                              <div className="text-xs text-amber-800">
                                {q.tips}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Study Plan Result */}
                {result.type === "studyplan" && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <Map className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">
                        Study Plan: {topic?.title}
                      </span>
                      <span className="ml-auto text-xs text-gray-500">
                        {hoursPerDay}h/day
                      </span>
                    </div>
                    <div className="p-6">
                      <MarkdownBlock text={result.data} />
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="mt-4 flex gap-3">
                  <a
                    href={`/quiz?topic=${topicId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Brain className="w-4 h-4" /> Take Quiz
                  </a>
                  <a
                    href={`/flashcards?topic=${topicId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" /> Study Flashcards
                  </a>
                </div>
              </>
            )}
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
