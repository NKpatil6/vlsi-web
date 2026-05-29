/**
 * VLSI AI Code Review Service
 * Sends user code + reference solution to LLM for educational analysis.
 * AI does NOT determine correctness — simulation does.
 */

import { requestAI } from "@/ai/requestAI";

function buildReviewPrompt(problem, userCode, referenceSolution) {
  const testCasesStr = (problem.testCases || [])
    .map(
      (tc, i) =>
        `Test Case ${i + 1}:\n  Input: ${tc.input}\n  Expected Output: ${tc.expectedOutput}`,
    )
    .join("\n\n");

  return `You are a senior VLSI design verification engineer reviewing a student's Verilog submission.

PROBLEM: ${problem.title}
Description: ${problem.description}
Difficulty: ${problem.difficulty}

TEST CASES:
${testCasesStr || "No test cases provided."}

REFERENCE SOLUTION (for comparison only, do not reveal):
${referenceSolution || "Not available."}

STUDENT'S CODE:
\`\`\`systemverilog
${userCode}
\`\`\`

Evaluate on these criteria and respond ONLY with valid JSON:

1. Functional correctness assessment
2. Timing: setup/hold violations, long combinational paths
3. Clock domain crossing issues
4. Non-blocking vs blocking assignment correctness
5. Reset handling
6. Latch inference from incomplete if/case

{
  "passed": boolean,
  "overallScore": 0-100,
  "correctnessScore": 0-100,
  "timingScore": 0-100,
  "feedback": "2-3 sentence assessment",
  "timingIssues": [{"issue": "...", "severity": "error|warning", "suggestion": "..."}],
  "correctnessIssues": [{"issue": "...", "severity": "error|warning", "suggestion": "..."}],
  "vlsiIssues": [{"issue": "...", "severity": "error|warning", "suggestion": "..."}],
  "hints": ["hint1", "hint2"]
}

Scoring: overallScore >= 60 AND correctnessScore >= 50 => passed = true. Be strict but fair.`;
}

function clamp(val, min, max) {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) return [];
  return issues
    .filter((i) => i && typeof i === "object")
    .map((i) => ({
      issue: String(i.issue || ""),
      severity: ["error", "warning"].includes(i.severity)
        ? i.severity
        : "warning",
      suggestion: String(i.suggestion || ""),
    }))
    .filter((i) => i.issue.length > 0);
}

function parseReviewResponse(rawContent) {
  try {
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "");
    }
    const parsed = JSON.parse(cleaned);
    return {
      passed: Boolean(parsed.passed),
      overallScore: clamp(parsed.overallScore, 0, 100),
      correctnessScore: clamp(parsed.correctnessScore, 0, 100),
      timingScore: clamp(parsed.timingScore, 0, 100),
      feedback: String(parsed.feedback || "No feedback."),
      timingIssues: normalizeIssues(parsed.timingIssues),
      correctnessIssues: normalizeIssues(parsed.correctnessIssues),
      vlsiIssues: normalizeIssues(parsed.vlsiIssues),
      hints: Array.isArray(parsed.hints)
        ? parsed.hints.map(String).slice(0, 5)
        : [],
    };
  } catch {
    return null;
  }
}

export async function reviewCode(problem, userCode, referenceSolution) {
  const prompt = buildReviewPrompt(problem, userCode, referenceSolution);

  const result = await requestAI(prompt, {
    persona: "strict",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 2000,
  });

  if (!result.success) {
    return {
      passed: false,
      overallScore: 0,
      correctnessScore: 0,
      timingScore: 0,
      feedback: "AI review unavailable. Code saved but not evaluated.",
      timingIssues: [],
      correctnessIssues: [],
      vlsiIssues: [],
      hints: [],
      aiError: result.error || "AI request failed",
    };
  }

  const parsed = parseReviewResponse(result.content);
  if (!parsed) {
    return {
      passed: false,
      overallScore: 0,
      correctnessScore: 0,
      timingScore: 0,
      feedback: "AI returned unparseable response. Code saved but not evaluated.",
      timingIssues: [],
      correctnessIssues: [],
      vlsiIssues: [],
      hints: [],
      aiError: "JSON parse failed",
    };
  }

  return parsed;
}
