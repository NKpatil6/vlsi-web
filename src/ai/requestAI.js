import {
  validateQuizResponse,
  validateFlashcardResponse,
  validateExplanation,
  validateCodingProblem,
  safeJSONParse,
} from "./validators";
import { requestGemini } from "./geminiProvider";

// ─── MODEL REGISTRY ──────────────────────────────────────────────────────────
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

// ─── AI Providers ─────────────────────────────────────────────────────────────
export const AI_PROVIDERS = {
  GROQ: "groq",
  GEMINI: "gemini",
};

/** Read the active provider from settings (defaults to groq). */
function getActiveProvider() {
  try {
    const s = JSON.parse(localStorage.getItem("vlsi_settings") || "{}");
    return s.ai_provider || AI_PROVIDERS.GROQ;
  } catch {
    return AI_PROVIDERS.GROQ;
  }
}

// ─── AI Personas ──────────────────────────────────────────────────────────────
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

/**
 * Centralized AI request — routes to Groq or Gemini based on settings.
 * Provider is read from localStorage under `vlsi_settings.ai_provider`.
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

  // ── Route to Gemini if selected ──────────────────────────────────────────
  const provider = options.provider || getActiveProvider();
  if (provider === AI_PROVIDERS.GEMINI) {
    return requestGemini(prompt, {
      systemPrompt: personaConfig.systemPrompt,
      maxTokens,
      temperature,
      retries,
      model: options.geminiModel,
    });
  }

  // ── Groq (API key stored in localStorage settings) ───────────────────────
  if (useGroq) {
    let groqKey = null;
    try {
      const settings = JSON.parse(localStorage.getItem("vlsi_settings") || "{}");
      groqKey = settings.groq_api_key || null;
    } catch {}

    if (!groqKey) {
      return {
        success: false,
        error: "Groq API key not configured. Add it in Settings.",
        content: null,
      };
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let res;
        try {
          res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: personaConfig.systemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: options.temperature || 0.7,
              max_tokens: maxTokens,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (res.status === 429) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 30000));
            continue;
          }
          break;
        }
        if (!res.ok) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          break;
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          break;
        }
        return {
          success: true,
          content,
          provider: "groq",
          model: data.model || model,
        };
      } catch (err) {
        if (err.name === "AbortError") break;
        if (attempt < retries)
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  return { success: false, error: "Groq request failed", content: null };
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

/**
 * Extract module names from Verilog/SystemVerilog source code.
 */
function extractModuleNames(code) {
  if (!code) return [];
  const modules = [];
  const regex = /\bmodule\s+(\w+)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    modules.push(match[1]);
  }
  return modules;
}

/**
 * Validate that AI diagnostic only references modules present in the source code.
 * Returns { valid, sanitized, hallucinatedModules }.
 */
export function validateDiagnosticResponse(diagnostic, allowedModules) {
  if (!diagnostic || !allowedModules?.length) {
    return { valid: true, sanitized: diagnostic, hallucinatedModules: [] };
  }

  const allowed = new Set(allowedModules.map((m) => m.toLowerCase()));
  const infrastructure = new Set([
    "tb", "testbench", "clk_gen", "stimulus", "checker", "monitor", "driver",
    "interface", "package", "top", "dut",
  ]);

  const moduleRefPattern = /\b(?:module|block|unit|instance|inst|entity)\s+(\w+)|(\w+)(?:_inst|_i\d*)\b/gi;
  const mentioned = new Set();
  let match;
  while ((match = moduleRefPattern.exec(diagnostic)) !== null) {
    const name = (match[1] || match[2] || "").toLowerCase();
    if (name.length > 2 && !infrastructure.has(name)) {
      mentioned.add(name);
    }
  }

  const hallucinated = [...mentioned].filter((m) => !allowed.has(m) && !infrastructure.has(m));

  if (hallucinated.length === 0) {
    return { valid: true, sanitized: diagnostic, hallucinatedModules: [] };
  }

  const lines = diagnostic.split("\n");
  const sanitized = [];
  let skipSection = false;

  for (const line of lines) {
    if (line.match(/^#{1,3}\s/) || line.match(/^\*\*[^*]+\*\*/)) {
      skipSection = false;
    }
    const referencesHallucinated = hallucinated.some((h) => line.toLowerCase().includes(h));
    if (referencesHallucinated && !line.match(/^#{1,3}\s/)) {
      skipSection = true;
      continue;
    }
    if (!skipSection) {
      sanitized.push(line);
    }
  }

  console.warn("[AI Analyzer] Hallucinated modules detected and removed:", hallucinated);

  return {
    valid: false,
    sanitized: sanitized.join("\n").trim(),
    hallucinatedModules: hallucinated,
  };
}

/**
 * Generate waveform diagnostic analysis for simulation mismatches.
 * Operates ONLY on real simulation context — never infers unrelated modules.
 */
export async function generateWaveformDiagnostic({
  challengeTitle,
  problemStatement,
  userRtl,
  testbench,
  compileLog,
  simulationLog,
  waveformDiff,
  failureTimestamp,
  expectedOutput,
  actualOutput,
  // Legacy params (backwards compat)
  topic,
  simulatorLogs,
  userCode,
}) {
  const title = challengeTitle || topic || "Unknown Challenge";
  const rtl = userRtl || userCode || "";
  const compile = compileLog || "";
  const simulation = simulationLog || simulatorLogs || "";
  const expected = expectedOutput || "";
  const actual = actualOutput || "";

  const userModules = extractModuleNames(rtl);
  const testbenchModules = testbench ? extractModuleNames(testbench) : [];
  const allModules = [...new Set([...userModules, ...testbenchModules])];
  const moduleList = allModules.length > 0
    ? allModules.map((m) => "  - " + m).join("\n")
    : "  - (no modules detected in code)";

  const prompt =
    "You are an expert VLSI Design Verification Engineer.\n" +
    "Analyze the simulation results below and provide a targeted diagnostic.\n\n" +
    "=== STRICT RULES ===\n" +
    "- ONLY discuss modules, signals, and behaviors present in the code below\n" +
    "- NEVER invent, assume, or reference modules not listed\n" +
    "- NEVER discuss decoder, FIFO, FSM, CDC, or any module unless it explicitly exists in the code\n" +
    "- If the challenge is about a counter, ONLY discuss counter-related logic\n\n" +
    "=== CHALLENGE ===\n" +
    "Title: " + title + "\n" +
    "Problem: " + (problemStatement || "N/A") + "\n\n" +
    "=== ALLOWED MODULES (ONLY discuss these) ===\n" + moduleList + "\n\n" +
    "=== USER RTL CODE ===\n" + (rtl || "No code provided") + "\n\n" +
    (testbench ? "=== TESTBENCH ===\n" + testbench + "\n\n" : "") +
    (compile ? "=== COMPILE LOG ===\n" + compile + "\n\n" : "") +
    (simulation ? "=== SIMULATION LOG ===\n" + simulation + "\n\n" : "") +
    (waveformDiff ? "=== WAVEFORM DIFF ===\n" + waveformDiff + "\n\n" : "") +
    (expected ? "=== EXPECTED OUTPUT ===\n" + expected + "\n\n" : "") +
    (actual ? "=== ACTUAL OUTPUT ===\n" + actual + "\n\n" : "") +
    (failureTimestamp ? "Failure Timestamp: " + failureTimestamp + "\n\n" : "") +
    "Provide exactly this format:\n\n" +
    "## Simulation Diagnostic\n\n" +
    "**The Symptom:** [what went wrong — reference specific signals from the code above]\n\n" +
    "### Root Cause Analysis\n" +
    "[analyze ONLY the modules and signals listed above]\n\n" +
    "### How to Fix\n" +
    "[specific fix with code referencing the actual module names]\n\n" +
    "Be concise, technical, and actionable. No conversational filler.";

  const aiResponse = await requestAI(prompt, {
    temperature: 0.4,
    maxTokens: 3000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, diagnostic: "" };
  }

  let diagnostic = String(aiResponse.content || "").trim().substring(0, 8000);

  const validation = validateDiagnosticResponse(diagnostic, allModules);
  if (!validation.valid) {
    diagnostic = validation.sanitized || diagnostic;
  }

  return {
    success: diagnostic.length > 50,
    diagnostic,
    hallucinatedModules: validation.hallucinatedModules,
    error: diagnostic.length <= 50 ? "Diagnostic too short" : undefined,
  };
}

/**
 * Generate a Find-the-Bug debugging challenge.
 */
export async function generateBugChallenge(topicTitle, difficulty = "intermediate") {
  const prompt =
    "You are a deterministic hardware engineering synthesis engine. " +
    "Generate a 'Find the Bug' debugging challenge for VLSI students.\n\n" +
    "Target Student Level: " + difficulty + "\n" +
    "Core Topic Focus: " + topicTitle + "\n\n" +
    "STRICT RULES:\n" +
    "- Exactly ONE intentional realistic bug\n" +
    "- No comments in generated code\n" +
    "- Fixed external interface\n" +
    "- Hidden testbench outputs sim_output.vcd\n\n" +
    "Return exactly this JSON schema:\n" +
    "{\n" +
    '  "title": "Short descriptive title",\n' +
    '  "difficulty": "' + difficulty + '",\n' +
    '  "bug_type_category": "e.g., off-by-one, latch inference, clock edge, reset polarity",\n' +
    '  "problem_statement_markdown": "Detailed description of the expected behavior and the bug hint",\n' +
    '  "fixed_port_template_with_bug": "Complete module code WITH the intentional bug",\n' +
    '  "hidden_sv_testbench": "Self-contained SystemVerilog testbench that exposes the bug",\n' +
    '  "internal_golden_solution": "The correct implementation without the bug"\n' +
    "}\n\n" +
    "Return ONLY the JSON object. No markdown blocks, no explanations.";

  const aiResponse = await requestAI(prompt, {
    temperature: 0.7,
    maxTokens: 5000,
  });

  if (!aiResponse.success) {
    return { success: false, error: aiResponse.error, challenge: null };
  }

  const parsed = safeJSONParse(extractJSON(aiResponse.content), null);
  if (!parsed || !parsed.title || !parsed.fixed_port_template_with_bug) {
    return { success: false, error: "Invalid challenge format", challenge: null };
  }

  return {
    success: true,
    challenge: {
      title: String(parsed.title || "").trim(),
      difficulty: String(parsed.difficulty || difficulty).trim(),
      bugType: String(parsed.bug_type_category || "").trim(),
      problemStatement: String(parsed.problem_statement_markdown || "").trim(),
      buggyCode: String(parsed.fixed_port_template_with_bug || "").trim(),
      testbench: String(parsed.hidden_sv_testbench || "").trim(),
      goldenSolution: String(parsed.internal_golden_solution || "").trim(),
    },
  };
}
