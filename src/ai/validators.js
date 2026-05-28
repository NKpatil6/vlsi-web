// Pure JavaScript AI validation layer (no external dependencies)

export function isValidString(value, minLength = 1, maxLength = Infinity) {
  return (
    typeof value === "string" &&
    value.trim().length >= minLength &&
    value.trim().length <= maxLength
  );
}

export function isValidNumber(value, min = -Infinity, max = Infinity) {
  return (
    typeof value === "number" && !isNaN(value) && value >= min && value <= max
  );
}

export function isValidArray(value, minLength = 0, maxLength = Infinity) {
  return (
    Array.isArray(value) &&
    value.length >= minLength &&
    value.length <= maxLength
  );
}

export function isValidEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

export function validateQuizQuestion(question) {
  const errors = [];

  if (!isValidString(question?.question, 10, 500)) {
    errors.push("Question text must be between 10-500 characters");
  }

  if (!isValidArray(question?.options, 2, 6)) {
    errors.push("Must have 2-6 options");
  } else {
    const validOptions = question.options.every((opt) =>
      isValidString(opt, 1, 200),
    );
    if (!validOptions) {
      errors.push("Each option must be 1-200 characters");
    }
  }

  if (
    !isValidNumber(question?.correctAnswer, 0, question?.options?.length - 1)
  ) {
    errors.push("correctAnswer must be a valid option index");
  }

  if (!isValidString(question?.explanation, 10, 1000)) {
    errors.push("Explanation must be between 10-1000 characters");
  }

  if (
    !isValidEnum(question?.difficulty, ["beginner", "intermediate", "advanced"])
  ) {
    errors.push("Difficulty must be beginner, intermediate, or advanced");
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized:
      errors.length === 0
        ? {
            question: sanitizeText(question.question),
            options: question.options.map(sanitizeText),
            correctAnswer: question.correctAnswer,
            explanation: sanitizeText(question.explanation),
            difficulty: question.difficulty,
          }
        : null,
  };
}

export function validateQuizResponse(response) {
  const errors = [];

  if (!isValidArray(response?.questions, 1, 20)) {
    errors.push("Response must contain 1-20 questions");
    return { valid: false, errors, sanitized: null };
  }

  const validatedQuestions = [];
  response.questions.forEach((q, index) => {
    const result = validateQuizQuestion(q);
    if (result.valid) {
      validatedQuestions.push(result.sanitized);
    } else {
      errors.push(`Question ${index + 1}: ${result.errors.join(", ")}`);
    }
  });

  return {
    valid: validatedQuestions.length > 0,
    errors,
    sanitized:
      validatedQuestions.length > 0 ? { questions: validatedQuestions } : null,
  };
}

export function validateFlashcard(flashcard) {
  const errors = [];

  if (!isValidString(flashcard?.front, 5, 300)) {
    errors.push("Front must be 5-300 characters");
  }

  if (!isValidString(flashcard?.back, 10, 2000)) {
    errors.push("Back must be 10-2000 characters");
  }

  if (
    !isValidEnum(flashcard?.difficulty, [
      "beginner",
      "intermediate",
      "advanced",
    ])
  ) {
    errors.push("Invalid difficulty level");
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized:
      errors.length === 0
        ? {
            front: sanitizeText(flashcard.front),
            back: sanitizeText(flashcard.back),
            difficulty: flashcard.difficulty,
          }
        : null,
  };
}

export function validateFlashcardResponse(response) {
  const errors = [];

  if (!isValidArray(response?.flashcards, 1, 50)) {
    errors.push("Response must contain 1-50 flashcards");
    return { valid: false, errors, sanitized: null };
  }

  const validatedFlashcards = [];
  response.flashcards.forEach((card, index) => {
    const result = validateFlashcard(card);
    if (result.valid) {
      validatedFlashcards.push(result.sanitized);
    } else {
      errors.push(`Flashcard ${index + 1}: ${result.errors.join(", ")}`);
    }
  });

  return {
    valid: validatedFlashcards.length > 0,
    errors,
    sanitized:
      validatedFlashcards.length > 0
        ? { flashcards: validatedFlashcards }
        : null,
  };
}

export function validateExplanation(explanation) {
  const errors = [];

  if (!isValidString(explanation?.explanation, 50, 5000)) {
    errors.push("Explanation must be 50-5000 characters");
  }

  if (!isValidArray(explanation?.keyPoints, 1, 10)) {
    errors.push("Must have 1-10 key points");
  } else {
    const validPoints = explanation.keyPoints.every((p) =>
      isValidString(p, 10, 300),
    );
    if (!validPoints) {
      errors.push("Each key point must be 10-300 characters");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized:
      errors.length === 0
        ? {
            explanation: sanitizeText(explanation.explanation),
            keyPoints: explanation.keyPoints.map(sanitizeText),
            examples: Array.isArray(explanation.examples)
              ? explanation.examples.map(sanitizeText).slice(0, 5)
              : [],
            resources: Array.isArray(explanation.resources)
              ? explanation.resources
                  .filter((r) => isValidString(r, 10, 500))
                  .slice(0, 5)
              : [],
          }
        : null,
  };
}

export function validateCodingProblem(problem) {
  const errors = [];

  if (!isValidString(problem?.title, 5, 200)) {
    errors.push("Title must be 5-200 characters");
  }

  if (!isValidString(problem?.description, 20, 3000)) {
    errors.push("Description must be 20-3000 characters");
  }

  if (
    !isValidEnum(problem?.difficulty, ["beginner", "intermediate", "advanced"])
  ) {
    errors.push("Invalid difficulty level");
  }

  if (!isValidString(problem?.starterCode, 10, 5000)) {
    errors.push("Starter code must be 10-5000 characters");
  }

  if (!isValidArray(problem?.testCases, 1, 10)) {
    errors.push("Must have 1-10 test cases");
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized:
      errors.length === 0
        ? {
            title: sanitizeText(problem.title),
            description: sanitizeText(problem.description),
            difficulty: problem.difficulty,
            starterCode: problem.starterCode, // Don't sanitize code
            solution: problem.solution || "",
            testCases: problem.testCases
              .map((tc) => ({
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
              }))
              .slice(0, 10),
          }
        : null,
  };
}

// Text sanitization
export function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframe tags
    .substring(0, 10000); // Max length safety cap
}

// Safe array normalization
export function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => item != null).slice(0, 100);
}

// Safe JSON parsing with fallback
export function safeJSONParse(jsonString, fallback = null) {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.error("[AI] JSON parse error:", error);
    return fallback;
  }
}
