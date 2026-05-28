import {
  validateQuizResponse,
  validateFlashcardResponse,
  validateExplanation,
  validateCodingProblem,
  safeJSONParse,
} from "./validators";

// ─── MODEL REGISTRY (mirrors original GitHub project) ──────────────────────
export const AI_MODELS = {
  LLAMA_70B: "llama-3.3-70b-versatile",
  LLAMA_8B: "llama-3.1-8b-instant",
  MIXTRAL: "mixtral-8x7b-32768",
};
export const DEFAULT_MODEL = AI_MODELS.LLAMA_70B;
export const MODEL_DISPLAY_NAMES = {
  [AI_MODELS.LLAMA_70B]: "Llama 3.3 70B Versatile (Groq — Free)",
  [AI_MODELS.LLAMA_8B]: "Llama 3.1 8B Instant (Groq — Free)",
  [AI_MODELS.MIXTRAL]: "Mixtral 8x7B 32K (Groq — Free)",
};

// AI Personas (mirrors original GitHub project)
export const AI_PERSONAS = {
  standard: {
    name: "Standard Mentor",
    systemPrompt:
      "You are an expert VLSI Design Verification mentor. Provide balanced, helpful, and encouraging guidance. Focus on clarity and concept mastery.",
  },
  strict: {
    name: "Strict Interviewer",
    systemPrompt:
      "You are a senior VLSI interviewer at a top semiconductor company. Be concise, critical, and focused on interview performance. Use high standards.",
  },
  mentor: {
    name: "Design Architect",
    systemPrompt:
      'You are a Lead VLSI Architect. Focus on deep architectural insights, best practices, scalability, and the "why" behind verification choices.',
  },
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 60000;
const ANTHROPIC_ENDPOINT = "/integrations/anthropic-claude-opus-4-1/";

/**
 * Centralized AI request — tries Groq first (via /api/ai), falls back to Anthropic.
 * Mirrors the original GitHub project's agentRouterService architecture.
 */
export async function requestAI(prompt, options = {}) {
  const {
    model = DEFAULT_MODEL,
    persona = "standard",
    maxTokens = 4000,
    temperature = 0.7,
    retries = MAX_RETRIES,
    useGroq = true,
  } = options;

  const personaConfig = AI_PERSONAS[persona] || AI_PERSONAS.standard;
  const fullPrompt = personaConfig.systemPrompt + "\n\nTask: " + prompt;

  // 1. Try Groq via /api/ai proxy (original GitHub pattern)
  if (useGroq) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let res;
        try {
          res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: fullPrompt, model }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const data = await res.json();

        if (data.code === "NOT_CONFIGURED") {
          // No Groq key — fall through to Anthropic silently
          break;
        }
        if (data.code === "RATE_LIMITED") {
          const wait = data.retryAfter || 30000;
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          break; // Fall through to Anthropic
        }
        if (!data.success) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          break;
        }
        return {
          success: true,
          content: data.content,
          provider: "groq",
          model: data.model,
        };
      } catch (err) {
        if (err.name === "AbortError") break;
        if (attempt < retries)
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  // 2. Fallback: Anthropic Claude Opus 4.1
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res;
      try {
        res = await fetch(ANTHROPIC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: fullPrompt }],
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error("Anthropic error: " + res.status);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || "";
      if (!content) throw new Error("Empty response");
      return { success: true, content, provider: "anthropic" };
    } catch (err) {
      if (attempt < retries)
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      else
        return {
          success: false,
          error: err.message || "All AI providers failed",
          content: null,
        };
    }
  }

  return { success: false, error: "All AI providers failed", content: null };
}

function extractJSON(content) {
  if (!content) return "";
  let text = content.trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (text.startsWith(fence)) {
    text = text.slice(3);
    const newlineIdx = text.indexOf("\n");
    if (newlineIdx > -1 && newlineIdx < 10) {
      text = text.slice(newlineIdx + 1);
    }
    if (text.endsWith(fence)) {
      text = text.slice(0, -3);
    }
    text = text.trim();
  }
  return text;
}

/**
 * Generate quiz questions with validation
 */
export async function generateQuiz(
  topicTitle,
  topicDescription,
  difficulty,
  count,
) {
  count = count || 5;
  const prompt =
    "Generate " +
    count +
    ' multiple-choice quiz questions about "' +
    topicTitle +
    '".\n\n' +
    "Topic description: " +
    topicDescription +
    "\n\n" +
    "Difficulty level: " +
    difficulty +
    "\n\n" +
    "Requirements:\n" +
    "- Each question must test understanding, not just memorization\n" +
    "- Provide exactly 4 options per question\n" +
    "- Include clear explanations for correct answers\n" +
    "- correctAnswer is 0-based index (0, 1, 2, or 3)\n\n" +
    "Return ONLY valid JSON:\n" +
    '{ "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "...", "difficulty": "' +
    difficulty +
    '" } ] }';

  const aiResponse = await requestAI(prompt, { temperature: 0.8 });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, questions: [] };
  }

  const jsonText = extractJSON(aiResponse.content);
  const parsed = safeJSONParse(jsonText, null);

  if (!parsed) {
    return {
      success: false,
      error: "Failed to parse AI response as JSON",
      questions: [],
    };
  }

  const validation = validateQuizResponse(parsed);

  if (!validation.valid) {
    console.error("[AI Quiz Validation]", validation.errors);
    // Try to recover partial questions
    if (
      validation.sanitized &&
      validation.sanitized.questions &&
      validation.sanitized.questions.length > 0
    ) {
      return { success: true, questions: validation.sanitized.questions };
    }
    return {
      success: false,
      error: "AI generated invalid quiz format",
      questions: [],
      validationErrors: validation.errors,
    };
  }

  return {
    success: true,
    questions: validation.sanitized.questions,
    raw: aiResponse.raw,
  };
}

/**
 * Generate flashcards with validation
 */
export async function generateFlashcards(topicTitle, topicDescription, count) {
  count = count || 10;
  const prompt =
    "Generate " +
    count +
    ' flashcards about "' +
    topicTitle +
    '".\n\n' +
    "Topic description: " +
    topicDescription +
    "\n\n" +
    "Requirements:\n" +
    "- Front: clear question or concept name\n" +
    "- Back: comprehensive answer with examples\n" +
    "- Cover key concepts, definitions, and practical applications\n\n" +
    "Return ONLY valid JSON:\n" +
    '{ "flashcards": [ { "front": "...", "back": "...", "difficulty": "intermediate" } ] }';

  const aiResponse = await requestAI(prompt, { temperature: 0.7 });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, flashcards: [] };
  }

  const jsonText = extractJSON(aiResponse.content);
  const parsed = safeJSONParse(jsonText, null);

  if (!parsed) {
    return {
      success: false,
      error: "Failed to parse AI response as JSON",
      flashcards: [],
    };
  }

  const validation = validateFlashcardResponse(parsed);

  if (!validation.valid) {
    console.error("[AI Flashcard Validation]", validation.errors);
    if (
      validation.sanitized &&
      validation.sanitized.flashcards &&
      validation.sanitized.flashcards.length > 0
    ) {
      return { success: true, flashcards: validation.sanitized.flashcards };
    }
    return {
      success: false,
      error: "AI generated invalid flashcard format",
      flashcards: [],
    };
  }

  return {
    success: true,
    flashcards: validation.sanitized.flashcards,
    raw: aiResponse.raw,
  };
}

/**
 * Generate topic explanation with validation
 */
export async function generateExplanation(
  topicTitle,
  specificConcept,
  topicDescription,
) {
  specificConcept = specificConcept || "";
  topicDescription = topicDescription || "";

  const conceptPart = specificConcept
    ? "\n\nFocus specifically on: " + specificConcept
    : "";

  const prompt =
    'Provide a comprehensive VLSI interview-focused explanation of "' +
    topicTitle +
    '".' +
    "\n\nContext: " +
    (topicDescription || topicTitle) +
    conceptPart +
    "\n\nInclude:\n" +
    "- Clear definition\n" +
    "- Underlying principles\n" +
    "- Concrete VLSI/digital design example\n" +
    "- Common interview questions on this topic\n" +
    "- Mistakes to avoid\n\n" +
    "Return ONLY valid JSON:\n" +
    '{ "explanation": "...", "keyPoints": ["..."], "examples": ["..."], "resources": [] }';

  const aiResponse = await requestAI(prompt, {
    temperature: 0.6,
    maxTokens: 3000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, explanation: null };
  }

  const jsonText = extractJSON(aiResponse.content);
  const parsed = safeJSONParse(jsonText, null);

  if (!parsed) {
    // Return raw content as plain text explanation
    return {
      success: true,
      explanation: {
        explanation: String(aiResponse.content || "").trim(),
        keyPoints: [],
        examples: [],
        resources: [],
      },
    };
  }

  const validation = validateExplanation(parsed);

  if (!validation.valid) {
    // Fallback: return raw content
    return {
      success: true,
      explanation: {
        explanation:
          parsed.explanation || String(aiResponse.content || "").trim(),
        keyPoints: Array.isArray(parsed.keyPoints)
          ? parsed.keyPoints.filter((p) => typeof p === "string")
          : [],
        examples: Array.isArray(parsed.examples)
          ? parsed.examples.filter((e) => typeof e === "string")
          : [],
        resources: [],
      },
    };
  }

  return {
    success: true,
    explanation: validation.sanitized,
    raw: aiResponse.raw,
  };
}

/**
 * Generate coding problem with validation
 */
export async function generateCodingProblem(
  topicTitle,
  topicDescription,
  difficulty,
) {
  difficulty = difficulty || "intermediate";
  const prompt =
    'Generate a Verilog/SystemVerilog coding problem about "' +
    topicTitle +
    '".\n\n' +
    "Topic: " +
    (topicDescription || topicTitle) +
    "\n" +
    "Difficulty: " +
    difficulty +
    "\n\n" +
    "Return ONLY valid JSON:\n" +
    '{ "problems": [ { "title": "...", "description": "...", "difficulty": "' +
    difficulty +
    '", "starterCode": "// Verilog code", "solution": "// Complete solution", "testCases": [ {"input": "...", "expectedOutput": "..."} ] } ] }';

  const aiResponse = await requestAI(prompt, {
    temperature: 0.7,
    maxTokens: 4000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, problems: [] };
  }

  const jsonText = extractJSON(aiResponse.content);
  const parsed = safeJSONParse(jsonText, null);

  if (!parsed || !Array.isArray(parsed.problems)) {
    return {
      success: false,
      error: "Failed to parse AI response as JSON",
      problems: [],
    };
  }

  const validProblems = [];
  (parsed.problems || []).forEach((problem, index) => {
    const validation = validateCodingProblem(problem);
    if (validation.valid) {
      validProblems.push(validation.sanitized);
    } else {
      console.warn(
        "Problem " + (index + 1) + " validation failed:",
        validation.errors,
      );
      // Accept partial problem if it has minimum required fields
      if (
        problem &&
        problem.title &&
        problem.description &&
        problem.starterCode
      ) {
        validProblems.push({
          title: String(problem.title).substring(0, 200),
          description: String(problem.description).substring(0, 3000),
          difficulty: ["beginner", "intermediate", "advanced"].includes(
            problem.difficulty,
          )
            ? problem.difficulty
            : difficulty,
          starterCode: String(problem.starterCode).substring(0, 5000),
          solution: String(problem.solution || "").substring(0, 5000),
          testCases: Array.isArray(problem.testCases)
            ? problem.testCases.slice(0, 10)
            : [],
        });
      }
    }
  });

  return {
    success: validProblems.length > 0,
    problems: validProblems,
    raw: aiResponse.raw,
  };
}

/**
 * Generate interview questions for a topic
 */
export async function generateInterviewQuestions(topicTitle, count) {
  count = count || 5;
  const prompt =
    "You are a senior VLSI interviewer at Qualcomm/Intel/AMD. Generate " +
    count +
    ' real technical interview questions about "' +
    topicTitle +
    '".\n\n' +
    "Return ONLY valid JSON:\n" +
    '{ "questions": [ { "question": "...", "category": "concept", "difficulty": "intermediate", "expectedAnswer": "...", "tips": "..." } ] }';

  const aiResponse = await requestAI(prompt, {
    temperature: 0.8,
    maxTokens: 4000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, questions: [] };
  }

  const jsonText = extractJSON(aiResponse.content);
  const parsed = safeJSONParse(jsonText, null);

  if (!parsed || !Array.isArray(parsed.questions)) {
    return {
      success: false,
      error: "Failed to parse interview questions",
      questions: [],
    };
  }

  const validDifficulties = ["beginner", "intermediate", "advanced"];
  const questions = (parsed.questions || [])
    .filter((q) => q && typeof q.question === "string" && q.question.length > 5)
    .map((q, idx) => ({
      id: "iq-" + Date.now() + "-" + idx,
      question: String(q.question || "")
        .trim()
        .substring(0, 500),
      category: String(q.category || "concept")
        .trim()
        .substring(0, 50),
      difficulty: validDifficulties.includes(q.difficulty)
        ? q.difficulty
        : "intermediate",
      expectedAnswer: String(q.expectedAnswer || "")
        .trim()
        .substring(0, 3000),
      tips: String(q.tips || "")
        .trim()
        .substring(0, 1000),
    }))
    .slice(0, 20);

  return {
    success: questions.length > 0,
    questions,
    error: questions.length === 0 ? "No valid questions generated" : undefined,
  };
}

/**
 * Generate a study plan for a topic
 */
export async function generateStudyPlan(topicTitle, availableHoursPerDay) {
  availableHoursPerDay = availableHoursPerDay || 2;
  const prompt =
    'You are a VLSI learning coach. Create a practical, day-by-day study plan for mastering "' +
    topicTitle +
    '" at ' +
    availableHoursPerDay +
    " hours per day.\n\n" +
    "Include:\n" +
    "- Day-by-day breakdown with specific activities\n" +
    "- What to read, practice, and code each day\n" +
    "- Key milestones to check progress\n" +
    "- Common mistakes to avoid\n" +
    "- Quick self-test questions at end of each milestone\n\n" +
    "Make it actionable and specific to VLSI interview preparation. Use clear markdown headers and bullet points.";

  const aiResponse = await requestAI(prompt, {
    temperature: 0.6,
    maxTokens: 3000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, plan: "" };
  }

  const plan = String(aiResponse.content || "")
    .trim()
    .substring(0, 10000);
  return {
    success: plan.length > 50,
    plan,
    error: plan.length <= 50 ? "Generated plan too short" : undefined,
  };
}
