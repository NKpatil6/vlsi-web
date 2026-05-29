"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { TOPICS } from "@/data/syllabusData";
import { generateQuiz } from "@/ai/requestAI";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { saveQuizAttempt } from "@/lib/storage";
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  Award,
  Zap,
} from "lucide-react";

const DIFFICULTY_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
    color: "text-green-300 bg-green-900/30 border-green-800/40",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    color: "text-yellow-300 bg-yellow-900/30 border-yellow-800/40",
  },
  {
    value: "advanced",
    label: "Advanced",
    color: "text-red-300 bg-red-900/30 border-red-800/40",
  },
];

function QuizSetup({ onStart }) {
  const [topicId, setTopicId] = useState(TOPICS[0]?.id || "");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (!topic) {
      setError("Please select a topic");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await generateQuiz(
        topic.title,
        topic.description,
        difficulty,
        count,
      );
      if (!result.success || result.questions.length === 0) {
        setError(result.error || "Failed to generate quiz. Please try again.");
        return;
      }
      onStart({ topic, questions: result.questions, difficulty });
    } catch (e) {
      setError("An error occurred generating the quiz.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-100 tracking-tight mb-2">
          AI Quiz
        </h1>
        <p className="text-sm text-gray-400">
          Test your knowledge with AI-generated questions
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
            className="w-full px-3 py-2.5 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <optgroup label="Digital Design Track">
              {TOPICS.filter((t) => t.track === "design").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Verification Track">
              {TOPICS.filter((t) => t.track === "verification").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Difficulty
          </label>
          <div className="flex gap-3">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                  difficulty === opt.value
                    ? opt.color + " ring-2 ring-offset-1 ring-current"
                    : "border-gray-700 text-gray-400 hover:bg-gray-700/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Number of Questions:{" "}
            <span className="text-purple-600 font-semibold">{count}</span>
          </label>
          <input
            type="range"
            min={3}
            max={10}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3</span>
            <span>10</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                style={{ animation: "spin 1s linear infinite" }}
              />
              Generating Quiz...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Start Quiz
            </>
          )}
        </button>
      </div>
      <style
        jsx
        global
      >{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function QuizQuestion({ question, index, total, onAnswer, userAnswer }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-gray-400">
          Question {index + 1} of {total}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/40">
          {question.difficulty}
        </span>
      </div>

      <h2 className="text-lg font-semibold text-gray-100 mb-6 leading-relaxed">
        {question.question}
      </h2>

      <div className="space-y-3">
        {(question.options || []).map((option, i) => {
          let style =
            "border-gray-700 text-gray-300 hover:border-purple-600 hover:bg-purple-900/20";
          if (userAnswer !== null && userAnswer !== undefined) {
            if (i === question.correctAnswer)
              style = "border-green-400 bg-green-900/30 text-green-200";
            else if (i === userAnswer && i !== question.correctAnswer)
              style = "border-red-400 bg-red-900/30 text-red-200";
            else style = "border-gray-700/50 text-gray-500 opacity-60";
          } else if (userAnswer === i) {
            style = "border-purple-400 bg-purple-900/30 text-purple-200";
          }

          return (
            <button
              key={i}
              onClick={() =>
                userAnswer === null || userAnswer === undefined
                  ? onAnswer(i)
                  : undefined
              }
              disabled={userAnswer !== null && userAnswer !== undefined}
              className={`w-full text-left px-5 py-3.5 border-2 rounded-xl text-sm font-medium transition-all ${style}`}
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {userAnswer !== null && userAnswer !== undefined && (
        <div
          className={`mt-5 p-4 rounded-xl border ${userAnswer === question.correctAnswer ? "bg-green-900/20 border-green-800/40" : "bg-amber-900/20 border-amber-800/40"}`}
        >
          <div className="flex items-start gap-2">
            {userAnswer === question.correctAnswer ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-sm text-gray-300">
              <span className="font-semibold">
                {userAnswer === question.correctAnswer
                  ? "Correct! "
                  : "Not quite. "}
              </span>
              {question.explanation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizResults({
  topic,
  questions,
  answers,
  timeSeconds,
  onRetry,
  onNewTopic,
}) {
  const { updateAnalytics } = useAnalyticsStore();
  const correctCount = answers.filter(
    (a, i) => a === questions[i].correctAnswer,
  ).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    // Save quiz attempt locally
    try {
      const correctCount = answers.filter((a, i) => a === questions[i].correctAnswer).length;
      saveQuizAttempt({
        topicId: topic.id,
        questions,
        answers,
        score: Math.round((correctCount / questions.length) * 100),
        timeSpentSeconds: timeSeconds,
      });
    } catch (e) {
      console.error("Save quiz error:", e);
    }

    // Update analytics
    try {
      updateAnalytics({ quizzesCompleted: 1 });
    } catch (e) {
      console.error("Analytics error:", e);
    }
  }, []);

  const grade =
    score >= 90
      ? { label: "Excellent!", color: "text-green-400", bg: "bg-green-900/30" }
      : score >= 75
        ? { label: "Good Job!", color: "text-blue-400", bg: "bg-blue-900/30" }
        : score >= 60
          ? {
              label: "Keep Going!",
              color: "text-yellow-400",
              bg: "bg-yellow-900/30",
            }
          : { label: "Keep Studying", color: "text-red-400", bg: "bg-red-900/30" };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className={`rounded-2xl ${grade.bg} border p-8 text-center mb-6`}>
        <div className={`text-5xl font-bold ${grade.color} mb-2`}>{score}%</div>
        <div className="text-xl font-semibold text-gray-100 mb-1">
          {grade.label}
        </div>
        <div className="text-sm text-gray-400">
          {correctCount}/{questions.length} correct ·{" "}
          {Math.round(timeSeconds / 60)}m {timeSeconds % 60}s
        </div>
      </div>

      {/* Per-question review */}
      <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-100 mb-4">
          Question Review
        </h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const correct = answers[i] === q.correctAnswer;
            return (
              <div key={i} className="flex items-start gap-3">
                {correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-100">
                    {q.question}
                  </div>
                  {!correct && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Your answer:{" "}
                      <span className="text-red-400">
                        {q.options[answers[i]] || "—"}
                      </span>{" "}
                      · Correct:{" "}
                      <span className="text-green-400">
                        {q.options[q.correctAnswer]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-700 text-sm font-medium text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Same Topic
        </button>
        <button
          onClick={onNewTopic}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
        >
          New Quiz
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const [phase, setPhase] = useState("setup"); // setup | quiz | results
  const [quizData, setQuizData] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // URL param for direct topic link
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const topicId = params.get("topic");
      // Pre-select topic handled in setup component
    }
  }, []);

  useEffect(() => {
    if (phase === "quiz") {
      const start = Date.now();
      setStartTime(start);
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - start) / 1000)),
        1000,
      );
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleStart = (data) => {
    setQuizData(data);
    setAnswers(new Array(data.questions.length).fill(null));
    setCurrentQ(0);
    setElapsed(0);
    setPhase("quiz");
  };

  const handleAnswer = (answerIndex) => {
    const updated = [...answers];
    updated[currentQ] = answerIndex;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentQ < quizData.questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      clearInterval(timerRef.current);
      setPhase("results");
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleRetry = () => {
    setPhase("setup");
    setQuizData(null);
  };

  const progressPct = quizData
    ? Math.round(((currentQ + 1) / quizData.questions.length) * 100)
    : 0;

  return (
    <AppLayout>
      {phase === "setup" && <QuizSetup onStart={handleStart} />}

      {phase === "quiz" && quizData && (
        <div className="p-6 max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="font-medium text-gray-100">
                {quizData.topic.title}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(elapsed / 60)}:
                {String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-6">
            <QuizQuestion
              question={quizData.questions[currentQ]}
              index={currentQ}
              total={quizData.questions.length}
              onAnswer={handleAnswer}
              userAnswer={answers[currentQ]}
            />

            <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-700/50">
              <button
                onClick={handlePrev}
                disabled={currentQ === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-700/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={
                  answers[currentQ] === null || answers[currentQ] === undefined
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {currentQ === quizData.questions.length - 1
                  ? "Finish Quiz"
                  : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "results" && quizData && (
        <QuizResults
          topic={quizData.topic}
          questions={quizData.questions}
          answers={answers}
          timeSeconds={elapsed}
          onRetry={handleRetry}
          onNewTopic={handleRetry}
        />
      )}
    </AppLayout>
  );
}
