import { z } from "zod";

// Core AI Response Schemas with strict validation

export const QuizQuestionSchema = z
  .object({
    question: z.string().min(10).max(500),
    options: z.array(z.string().min(1).max(200)).min(2).max(6),
    correctAnswer: z.number().int().min(0),
    explanation: z.string().min(10).max(1000),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  })
  .refine((data) => data.correctAnswer < data.options.length, {
    message: "correctAnswer index must be valid for options array",
  });

export const QuizResponseSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1).max(20),
});

export const FlashcardSchema = z.object({
  front: z.string().min(5).max(300),
  back: z.string().min(10).max(2000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

export const FlashcardResponseSchema = z.object({
  flashcards: z.array(FlashcardSchema).min(1).max(50),
});

export const ExplanationSchema = z.object({
  explanation: z.string().min(50).max(5000),
  keyPoints: z.array(z.string().min(10).max(300)).min(1).max(10),
  examples: z.array(z.string().min(20).max(1000)).optional(),
  resources: z.array(z.string().url()).optional(),
});

export const CodingProblemSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(3000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  starterCode: z.string().min(10).max(5000),
  solution: z.string().min(10).max(5000),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
      }),
    )
    .min(1)
    .max(10),
});

export const CodingProblemResponseSchema = z.object({
  problems: z.array(CodingProblemSchema).min(1).max(10),
});

export const InterviewQuestionSchema = z.object({
  question: z.string().min(10).max(500),
  category: z.string().min(3).max(100),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  expectedAnswer: z.string().min(20).max(3000),
  followUpQuestions: z.array(z.string()).optional(),
});

export const InterviewResponseSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(1).max(20),
});

// Validation helper functions
export function validateAIResponse(schema, data) {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      console.error("[AI Validation Error]", result.error.format());
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("[AI Validation Exception]", error);
    return { success: false, error };
  }
}

export function sanitizeAIText(text) {
  if (typeof text !== "string") return "";
  return text
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframe tags
    .substring(0, 10000); // Max length cap
}

export function normalizeAIArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => item != null).slice(0, 100); // Max 100 items
}
