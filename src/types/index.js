/**
 * @typedef {'design' | 'verification'} Track
 */

/**
 * @typedef {'beginner' | 'intermediate' | 'advanced'} DifficultyLevel
 */

/**
 * @typedef {'learning' | 'coding' | 'revision'} SessionType
 */

/**
 * @typedef {'one-time' | 'daily' | 'weekly'} RecurrenceType
 */

/**
 * @typedef {'pending' | 'completed' | 'missed' | 'in-progress'} SessionStatus
 */

/**
 * @typedef {Object} Topic
 * @property {string} id
 * @property {string} title
 * @property {Track} track
 * @property {number} order
 * @property {string[]} prerequisites
 * @property {string} description
 * @property {number} estimatedHours
 * @property {DifficultyLevel} difficulty
 * @property {string[]} subtopics
 * @property {string[]} learningObjectives
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} title
 * @property {SessionType} type
 * @property {string} topicId
 * @property {string} scheduledDate
 * @property {RecurrenceType} recurrence
 * @property {SessionStatus} status
 * @property {string} [completedAt]
 * @property {string} [notes]
 * @property {number} [durationMinutes]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} id
 * @property {string} topicId
 * @property {string} question
 * @property {string[]} options
 * @property {number} correctAnswer
 * @property {string} explanation
 * @property {DifficultyLevel} difficulty
 */

/**
 * @typedef {Object} QuizAttempt
 * @property {string} id
 * @property {string} topicId
 * @property {QuizQuestion[]} questions
 * @property {number[]} answers
 * @property {number} score
 * @property {string} completedAt
 * @property {number} timeSpentSeconds
 */

/**
 * @typedef {Object} Flashcard
 * @property {string} id
 * @property {string} topicId
 * @property {string} front
 * @property {string} back
 * @property {DifficultyLevel} difficulty
 * @property {string} [lastReviewed]
 * @property {string} [nextReview]
 * @property {number} easeFactor
 * @property {number} interval
 * @property {number} repetitions
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} iconName
 * @property {string} [unlockedAt]
 * @property {number} progress
 * @property {number} threshold
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {string} date
 * @property {number} studyMinutes
 * @property {number} sessionsCompleted
 * @property {number} quizzesCompleted
 * @property {number} flashcardsReviewed
 * @property {number} codingProblems
 */

/**
 * @typedef {Object} UserProgress
 * @property {string} topicId
 * @property {boolean} completed
 * @property {string} [completedAt]
 * @property {number} progress
 * @property {number} timeSpentMinutes
 * @property {string} [lastAccessedAt]
 */

export {};
