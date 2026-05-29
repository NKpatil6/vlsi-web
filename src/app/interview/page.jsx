"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import { generateInterviewQuestions } from "@/ai/requestAI";
import {
  MessageSquare,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
  BookOpen,
  Brain,
} from "lucide-react";

const DIFFICULTY_COLORS = {
  beginner: "bg-green-500/10 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/10 text-red-400 border-red-500/30",
};

const CATEGORY_ICONS = {
  concept: BookOpen,
  design: Brain,
  debug: AlertCircle,
  analysis: Star,
};

function QuestionCard({ question, index }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[question.category] || BookOpen;

  return (
    <div className="bg-[#1a2235] border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {index + 1}. {question.question}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.intermediate}`}
              >
                {question.difficulty}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400 capitalize bg-slate-700/30 px-2 py-0.5 rounded-full">
            {question.category}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/50 px-5 py-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Expected Answer
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {question.expectedAnswer}
            </div>
          </div>
          {question.tips && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">
                💡 What Interviewers Look For
              </div>
              <div className="text-sm text-amber-300 leading-relaxed">
                {question.tips}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewPage() {
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (!topic) {
      setError("Please select a topic");
      return;
    }
    setError("");
    setLoading(true);
    setQuestions([]);

    try {
      const result = await generateInterviewQuestions(topic.title, count);
      if (!result.success || result.questions.length === 0) {
        setError(result.error || "Failed to generate questions. Try again.");
        return;
      }
      setQuestions(result.questions);
      setGenerated(true);
    } catch (e) {
      setError("An error occurred. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const designTopics = TOPICS.filter((t) => t.track === "design");
  const verificationTopics = TOPICS.filter((t) => t.track === "verification");

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-1">
            Interview Prep
          </h1>
          <p className="text-sm text-slate-400">
            AI-generated questions from real VLSI interviews at Qualcomm, Intel,
            AMD, and NVIDIA
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#1a2235] border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-56">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => {
                  setTopicId(e.target.value);
                  setGenerated(false);
                }}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a topic...</option>
                <optgroup label="Digital Design Track">
                  {designTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Verification Track">
                  {verificationTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Count: {count}
              </label>
              <input
                type="range"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-32 accent-blue-600"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !topicId}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <RefreshCw
                  className="w-4 h-4"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {loading ? "Generating..." : "Generate Questions"}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!loading && questions.length === 0 && !generated && (
          <div className="text-center py-16 bg-[#1a2235] border border-slate-700 rounded-xl">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-base font-medium text-slate-300 mb-2">
              Ready to Prepare
            </div>
            <div className="text-sm text-slate-400 max-w-sm mx-auto">
              Select a topic above to generate real interview questions with
              detailed expected answers.
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 bg-[#1a2235] border border-slate-700 rounded-xl">
            <div
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div className="text-sm font-medium text-slate-300">
              Generating interview questions...
            </div>
            <div className="text-xs text-slate-400 mt-1">
              AI is curating questions from real VLSI interviews
            </div>
          </div>
        )}

        {/* Questions */}
        {!loading && questions.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-400 font-medium">
                {questions.length} questions generated
              </div>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-400 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <QuestionCard key={q.id || idx} question={q} index={idx} />
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <a
                href={"/quiz?topic=" + topicId}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/10 transition-colors"
              >
                <Brain className="w-4 h-4" />
                Take Quiz on This Topic
              </a>
              <a
                href="/ai-explorer"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Study in AI Explorer
              </a>
            </div>
          </>
        )}
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
