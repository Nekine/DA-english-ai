import { exerciseRepository } from "../database/repositories/exercise-repository";
import { appConfig } from "../config";

type MultipleChoiceQuestion = {
  Question: string;
  Options: string[];
  RightOptionIndex: number;
  ExplanationInVietnamese?: string;
  explanation?: string;
};

type SentenceWritingItem = {
  id: number;
  vietnamese: string;
  correctAnswer: string;
  suggestion?: {
    vocabulary?: Array<{ word: string; meaning: string }>;
    structure?: string;
  };
  Suggestion?: {
    Vocabulary?: Array<{ Word: string; Meaning: string }>;
    Structure?: string;
  };
};

type StoredGrammarQuestion = {
  q?: string;
  question?: string;
  options?: string[];
  ExplanationInVietnamese?: string;
  explanationInVietnamese?: string;
  explanation?: string;
};

type StoredSentenceWritingQuestion = {
  id?: number;
  vietnamese?: string;
  correctAnswer?: string;
  suggestion?: {
    vocabulary?: Array<{ word?: string; meaning?: string }>;
    structure?: string;
  };
  Suggestion?: {
    Vocabulary?: Array<{ Word?: string; Meaning?: string }>;
    Structure?: string;
  };
};

type SentenceWritingUserAnswer = {
  sentenceId?: number;
  userTranslation: string;
};

function optionIndexToLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 25) {
    return "A";
  }
  return String.fromCharCode(65 + index);
}

function normalizeText(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  return input
    .toLowerCase()
    .trim()
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ");
}

function letterToIndex(letter: string): number {
  const token = letter.trim().toUpperCase();
  if (token.length !== 1) {
    return -1;
  }

  const code = token.charCodeAt(0);
  if (code < 65 || code > 90) {
    return -1;
  }

  return code - 65;
}

export async function saveAiExercise(input: {
  requestedByTaiKhoanId: number;
  title: string;
  topic: string;
  content?: string;
  questions: MultipleChoiceQuestion[];
  level?: string;
  type?: string;
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
}) {
  if (!input.questions || input.questions.length === 0) {
    return { success: false, message: "Invalid exercise data" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Exercise generated successfully (no-db mode)",
      exerciseId: Date.now(),
    };
  }

  const questionsJson = JSON.stringify(
    input.questions.map((q) => {
      const explanation = String(q.ExplanationInVietnamese ?? q.explanation ?? "").trim();
      const normalizedExplanation =
        explanation || `Đáp án đúng là ${optionIndexToLetter(q.RightOptionIndex)} vì phù hợp nhất với ngữ cảnh và cấu trúc câu.`;
      return {
        q: q.Question,
        options: q.Options,
        ExplanationInVietnamese: normalizedExplanation,
        explanationInVietnamese: normalizedExplanation,
        explanation: normalizedExplanation,
      };
    }),
  );
  const correctAnswersJson = JSON.stringify(
    input.questions.map((q) => optionIndexToLetter(q.RightOptionIndex)),
  );

  const exerciseId = await exerciseRepository.save({
    requestedByTaiKhoanId: input.requestedByTaiKhoanId,
    title: input.title,
    topic: input.topic,
    content: input.content ?? null,
    questionsJson,
    correctAnswersJson,
    level: input.level ?? "A1",
    type: input.type ?? "mixed",
    category: input.category ?? input.topic,
    estimatedMinutes: input.estimatedMinutes ?? 10,
    timeLimit: input.timeLimit ?? 600,
    description: input.description ?? null,
    sourceType: "ai_generated",
  });

  if (!exerciseId) {
    return { success: false, message: "Unable to save exercise" };
  }

  return {
    success: true,
    message: "Exercise saved successfully",
    exerciseId,
  };
}

export async function saveSentenceWritingExercise(input: {
  requestedByTaiKhoanId: number;
  title: string;
  topic: string;
  content?: string;
  sentences: SentenceWritingItem[];
  level?: string;
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
}) {
  if (!input.sentences || input.sentences.length === 0) {
    return { success: false, message: "Invalid sentence writing data" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Sentence writing generated successfully (no-db mode)",
      exerciseId: Date.now(),
    };
  }

  const sentencesJson = JSON.stringify(
    input.sentences.map((s) => {
      const normalizedVocabulary = Array.isArray(s.suggestion?.vocabulary)
        ? s.suggestion.vocabulary
            .map((item) => ({
              word: String(item?.word ?? "").trim(),
              meaning: String(item?.meaning ?? "").trim(),
            }))
            .filter((item) => item.word.length > 0 && item.meaning.length > 0)
        : Array.isArray(s.Suggestion?.Vocabulary)
          ? s.Suggestion.Vocabulary
              .map((item) => ({
                word: String(item?.Word ?? "").trim(),
                meaning: String(item?.Meaning ?? "").trim(),
              }))
              .filter((item) => item.word.length > 0 && item.meaning.length > 0)
          : [];

      const normalizedStructure =
        String(s.suggestion?.structure ?? s.Suggestion?.Structure ?? "").trim();

      return {
        id: s.id,
        vietnamese: s.vietnamese,
        correctAnswer: s.correctAnswer,
        ...(normalizedVocabulary.length > 0 || normalizedStructure.length > 0
          ? {
              suggestion: {
                vocabulary: normalizedVocabulary,
                structure: normalizedStructure,
              },
              Suggestion: {
                Vocabulary: normalizedVocabulary.map((item) => ({
                  Word: item.word,
                  Meaning: item.meaning,
                })),
                Structure: normalizedStructure,
              },
            }
          : {}),
      };
    }),
  );

  const exerciseId = await exerciseRepository.saveSentenceWriting({
    requestedByTaiKhoanId: input.requestedByTaiKhoanId,
    title: input.title,
    topic: input.topic,
    content: input.content ?? null,
    sentencesJson,
    level: input.level ?? "Intermediate",
    category: input.category ?? input.topic,
    estimatedMinutes: input.estimatedMinutes ?? 15,
    timeLimit: input.timeLimit ?? 900,
    description: input.description ?? null,
  });

  if (!exerciseId) {
    return { success: false, message: "Unable to save sentence writing exercise" };
  }

  return {
    success: true,
    message: "Sentence writing exercise saved successfully",
    exerciseId,
  };
}

export async function submitAiExerciseResult(input: {
  requestedByTaiKhoanId: number;
  exerciseId: number;
  answers: string[];
  completedAt?: string;
}) {
  if (!Number.isInteger(input.exerciseId) || input.exerciseId <= 0) {
    return { success: false, message: "Invalid exercise id" };
  }

  if (!Array.isArray(input.answers) || input.answers.length === 0) {
    return { success: false, message: "Invalid answers" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Exercise submitted successfully (no-db mode)",
      score: 0,
      totalQuestions: input.answers.length,
      correctAnswers: 0,
      incorrectAnswers: input.answers.length,
    };
  }

  const nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return { success: false, message: "User not found" };
  }

  const exercise = await exerciseRepository.getExerciseById(input.exerciseId, nguoiDungId);
  if (!exercise || exercise.kieuBaiTap !== "grammar") {
    return { success: false, message: "Exercise not found" };
  }

  const payload = JSON.parse(exercise.noiDungJson) as {
    questions?: StoredGrammarQuestion[];
    correctAnswers?: string[];
  };

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const correctAnswers = Array.isArray(payload.correctAnswers) ? payload.correctAnswers : [];

  if (questions.length === 0 || correctAnswers.length === 0) {
    return { success: false, message: "Exercise data is invalid" };
  }

  const totalQuestions = questions.length;
  const details = questions.map((question, index) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const userAnswer = String(input.answers[index] ?? "").trim();
    const correctLetter = String(correctAnswers[index] ?? "").trim().toUpperCase();
    const correctIndex = letterToIndex(correctLetter);
    const correctOption = correctIndex >= 0 ? String(options[correctIndex] ?? "").trim() : "";

    const isCorrect = correctOption
      ? normalizeText(userAnswer) === normalizeText(correctOption)
      : userAnswer.trim().toUpperCase() === correctLetter;

    return {
      questionOrder: index + 1,
      questionType: "grammar",
      userAnswer: userAnswer || null,
      correctAnswer: (correctOption || correctLetter || null),
      isCorrect,
      scorePerQuestion:
        totalQuestions > 0 && isCorrect
          ? Math.round((10000 / totalQuestions)) / 100
          : 0,
      note: String(question.q ?? question.question ?? ""),
    };
  });

  const correctCount = details.reduce((sum, detail) => sum + (detail.isCorrect ? 1 : 0), 0);
  const incorrectCount = Math.max(0, totalQuestions - correctCount);
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;
  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();

  const resultJson = {
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    score,
    submittedAt: completedAt.toISOString(),
  };

  await exerciseRepository.addCompletion({
    nguoiDungId,
    exerciseId: input.exerciseId,
    answersJson: { answers: input.answers },
    resultJson,
    score,
    totalQuestions,
    correctAnswers: correctCount,
    completedAt,
    details,
  });

  return {
    success: true,
    message: "Exercise submitted successfully",
    score,
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
  };
}

export async function submitSentenceWritingResult(input: {
  requestedByTaiKhoanId: number;
  exerciseId: number;
  answers: SentenceWritingUserAnswer[];
  completedAt?: string;
}) {
  if (!Number.isInteger(input.exerciseId) || input.exerciseId <= 0) {
    return { success: false, message: "Invalid exercise id" };
  }

  if (!Array.isArray(input.answers) || input.answers.length === 0) {
    return { success: false, message: "Invalid answers" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Sentence writing submitted successfully (no-db mode)",
      score: 0,
      totalQuestions: input.answers.length,
      correctAnswers: 0,
      incorrectAnswers: input.answers.length,
      reviews: [],
    };
  }

  const nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return { success: false, message: "User not found" };
  }

  const exercise = await exerciseRepository.getExerciseById(input.exerciseId, nguoiDungId);
  if (!exercise || exercise.kieuBaiTap !== "writing") {
    return { success: false, message: "Exercise not found" };
  }

  const payload = JSON.parse(exercise.noiDungJson) as {
    sentences?: StoredSentenceWritingQuestion[];
  };
  const sentences = Array.isArray(payload.sentences) ? payload.sentences : [];

  if (sentences.length === 0) {
    return { success: false, message: "Exercise data is invalid" };
  }

  const bySentenceId = new Map<number, SentenceWritingUserAnswer>();
  for (const answer of input.answers) {
    if (Number.isInteger(answer.sentenceId) && (answer.sentenceId ?? 0) > 0) {
      bySentenceId.set(Number(answer.sentenceId), answer);
    }
  }

  const totalQuestions = sentences.length;
  const details = sentences.map((sentence, index) => {
    const fromId = Number.isInteger(sentence.id) ? bySentenceId.get(Number(sentence.id)) : undefined;
    const fallback = input.answers[index];
    const answer = fromId ?? fallback;

    const userAnswer = String(answer?.userTranslation ?? "").trim();
    const correctAnswer = String(sentence.correctAnswer ?? "").trim();
    const isCorrect = normalizeText(userAnswer) === normalizeText(correctAnswer) && normalizeText(correctAnswer) !== "";

    return {
      questionOrder: index + 1,
      questionType: "sentence_writing",
      userAnswer: userAnswer || null,
      correctAnswer: correctAnswer || null,
      isCorrect,
      scorePerQuestion:
        totalQuestions > 0 && isCorrect
          ? Math.round((10000 / totalQuestions)) / 100
          : 0,
      note: String(sentence.vietnamese ?? ""),
      sentenceId: Number(sentence.id ?? index + 1),
      vietnamese: String(sentence.vietnamese ?? ""),
    };
  });

  const correctCount = details.reduce((sum, detail) => sum + (detail.isCorrect ? 1 : 0), 0);
  const incorrectCount = Math.max(0, totalQuestions - correctCount);
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;
  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();

  const resultJson = {
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    score,
    submittedAt: completedAt.toISOString(),
  };

  await exerciseRepository.addCompletion({
    nguoiDungId,
    exerciseId: input.exerciseId,
    answersJson: {
      answers: input.answers,
    },
    resultJson,
    score,
    totalQuestions,
    correctAnswers: correctCount,
    completedAt,
    details,
  });

  return {
    success: true,
    message: "Sentence writing submitted successfully",
    score,
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    reviews: details.map((detail) => ({
      sentenceId: detail.sentenceId,
      vietnamese: detail.vietnamese,
      userAnswer: detail.userAnswer ?? "",
      correctAnswer: detail.correctAnswer ?? "",
      isCorrect: detail.isCorrect,
      score: detail.scorePerQuestion,
    })),
  };
}
