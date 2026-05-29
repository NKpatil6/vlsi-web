"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import { generateFlashcards } from "@/ai/requestAI";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { saveFlashcards, getFlashcards, reviewFlashcard } from "@/lib/storage";
import {
  Layers,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  Star,
  ThumbsDown,
} from "lucide-react";

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [front]);

  return (
    <div
      onClick={() => setFlipped((f) => !f)}
      style={{ perspective: "1200px", cursor: "pointer", userSelect: "none" }}
      className="w-full"
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: 260,
          transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          style={{
            backfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
          }}
          className="bg-[#1e293b] border-2 border-gray-700 rounded-2xl flex flex-col items-center justify-center p-8 shadow-sm"
        >
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Question
          </div>
          <div className="text-xl font-semibold text-gray-100 text-center leading-relaxed">
            {front}
          </div>
          <div className="mt-6 text-xs text-gray-500">
            Click to reveal answer
          </div>
        </div>
        {/* Back */}
        <div
          style={{
            backfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            transform: "rotateY(180deg)",
          }}
          className="bg-blue-900/20 border-2 border-blue-800/40 rounded-2xl flex flex-col p-8 shadow-sm overflow-y-auto"
        >
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4">
            Answer
          </div>
          <div className="text-sm font-medium text-gray-200 leading-relaxed whitespace-pre-wrap">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}

const RATING_OPTIONS = [
  {
    value: 1,
    label: "Again",
    icon: ThumbsDown,
    color: "text-red-400 bg-red-900/30 border-red-800/40 hover:bg-red-900/50",
  },
  {
    value: 3,
    label: "Hard",
    icon: AlertCircle,
    color: "text-orange-400 bg-orange-900/30 border-orange-800/40 hover:bg-orange-900/50",
  },
  {
    value: 4,
    label: "Good",
    icon: CheckCircle2,
    color: "text-blue-400 bg-blue-900/30 border-blue-800/40 hover:bg-blue-900/50",
  },
  {
    value: 5,
    label: "Easy",
    icon: Star,
    color: "text-green-400 bg-green-900/30 border-green-800/40 hover:bg-green-900/50",
  },
];

export default function FlashcardsPage() {
  const [phase, setPhase] = useState("setup"); // setup | study | complete
  const [topicId, setTopicId] = useState(TOPICS[0]?.id || "");
  const [cardCount, setCardCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { updateAnalytics } = useAnalyticsStore();

  // URL param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t) setTopicId(t);
    }
  }, []);

  const handleGenerate = async () => {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (!topic) {
      setError("Please select a topic");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await generateFlashcards(
        topic.title,
        topic.description,
        cardCount,
      );
      if (!result.success || result.flashcards.length === 0) {
        setError(result.error || "Failed to generate flashcards.");
        return;
      }
      // Save locally
      const savedCards = saveFlashcards(topicId, result.flashcards);
      setCards(savedCards);
      setRatings(new Array(savedCards.length).fill(null));
      setCurrentIdx(0);
      setPhase("study");
    } catch (e) {
      setError("Failed to generate flashcards.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExisting = () => {
    setLoading(true);
    try {
      const existing = getFlashcards(topicId);
      if (!existing || existing.length === 0) {
        setError("No flashcards found for this topic. Generate some first.");
        setLoading(false);
        return;
      }
      setCards(existing);
      setRatings(new Array(existing.length).fill(null));
      setCurrentIdx(0);
      setPhase("study");
    } catch (e) {
      setError("Failed to load flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = useCallback(
    async (rating) => {
      const card = cards[currentIdx];
      setSubmitting(true);
      try {
        // Submit SM-2 review locally
        if (card.id) {
          reviewFlashcard(card.id, rating);
        }
        const updated = [...ratings];
        updated[currentIdx] = rating;
        setRatings(updated);

        if (currentIdx < cards.length - 1) {
          setCurrentIdx(currentIdx + 1);
        } else {
          await updateAnalytics({ flashcardsReviewed: cards.length });
          setPhase("complete");
        }
      } catch (e) {
        console.error("Review error:", e);
        const updated = [...ratings];
        updated[currentIdx] = rating;
        setRatings(updated);
        if (currentIdx < cards.length - 1) setCurrentIdx(currentIdx + 1);
        else setPhase("complete");
      } finally {
        setSubmitting(false);
      }
    },
    [cards, currentIdx, ratings, updateAnalytics],
  );

  const goodCount = ratings.filter((r) => r >= 4).length;
  const studiedCount = ratings.filter((r) => r !== null).length;
  const topic = TOPICS.find((t) => t.id === topicId);

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {phase === "setup" && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-semibold text-gray-100 tracking-tight mb-2">
                Flashcards
              </h1>
              <p className="text-sm text-gray-400">
                Spaced repetition learning with SM-2 algorithm
              </p>
            </div>

            <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800/40 rounded-lg text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Topic
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <optgroup label="Digital Design Track">
                    {TOPICS.filter((t) => t.track === "design").map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Verification Track">
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cards to Generate:{" "}
                  <span className="text-indigo-600 font-semibold">
                    {cardCount}
                  </span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLoadExisting}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-medium text-gray-300 border border-gray-700 rounded-xl hover:bg-gray-700/30 disabled:opacity-60 transition-colors"
                >
                  Load Existing
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {loading ? "Generating..." : "Generate with AI"}
                </button>
              </div>
            </div>
          </>
        )}

        {phase === "study" && cards.length > 0 && (
          <>
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-100">
                  {topic?.title || "Flashcards"}
                </span>
                <span className="text-gray-400">
                  {currentIdx + 1} / {cards.length}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIdx + 1) / cards.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <FlipCard
              front={cards[currentIdx].front}
              back={cards[currentIdx].back}
            />

            {/* Rating Buttons */}
            <div className="mt-6">
              <div className="text-center text-xs font-medium text-gray-400 mb-3">
                How well did you know this?
              </div>
              <div className="grid grid-cols-4 gap-2">
                {RATING_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleRate(opt.value)}
                      disabled={submitting}
                      className={`flex flex-col items-center gap-1.5 py-3 text-xs font-semibold border rounded-xl transition-all disabled:opacity-50 ${opt.color}`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPhase("setup")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" /> Exit
              </button>
            </div>
          </>
        )}

        {phase === "complete" && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              Session Complete!
            </h2>
            <p className="text-gray-400 mb-6">
              You reviewed{" "}
              <span className="font-semibold text-gray-100">
                {cards.length}
              </span>{" "}
              cards.
              <br />
              <span className="text-green-400 font-semibold">{goodCount}</span>{" "}
              marked as good or easy.
            </p>

            <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-5 mb-6 text-left">
              <div className="text-sm font-semibold text-gray-300 mb-3">
                Rating Summary
              </div>
              {RATING_OPTIONS.map((opt) => {
                const count = ratings.filter((r) => r === opt.value).length;
                return (
                  <div key={opt.value} className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-gray-400 w-12">
                      {opt.label}
                    </span>
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full"
                        style={{
                          width: `${cards.length > 0 ? (count / cards.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPhase("setup")}
                className="flex-1 py-3 text-sm font-medium text-gray-300 border border-gray-700 rounded-xl hover:bg-gray-700/30"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                New Session
              </button>
              <Link
                to="/syllabus"
                className="flex-1 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                Continue Learning
              </Link>
            </div>
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
