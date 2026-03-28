import { randomUUID } from "node:crypto";

type SpeakingExercise = {
  ExerciseId: string;
  Topic: string;
  EnglishLevel: number;
  Title: string;
  Prompt: string;
  Hint: string;
};

const speakingCache = new Map<string, SpeakingExercise>();

const topicMap: Record<number, string> = {
  0: "Self Introduction",
  1: "Daily Life",
  2: "Hobbies and Interests",
  3: "Travel and Exploration",
  4: "Work and Career",
  5: "Education and Learning",
  6: "Technology and Future",
};

const levelMap: Record<number, string> = {
  1: "A1 - Beginner",
  2: "A2 - Elementary",
  3: "B1 - Intermediate",
  4: "B2 - Upper Intermediate",
  5: "C1 - Advanced",
  6: "C2 - Proficient",
};

export function getSpeakingTopics() {
  return topicMap;
}

export function getSpeakingEnglishLevels() {
  return levelMap;
}

export function generateSpeakingExercise(input: {
  Topic: number;
  EnglishLevel: number;
  CustomTopic?: string;
}) {
  const topic = input.CustomTopic?.trim() || topicMap[input.Topic] || "General Topic";
  const exercise: SpeakingExercise = {
    ExerciseId: randomUUID(),
    Topic: topic,
    EnglishLevel: Number(input.EnglishLevel) || 1,
    Title: `Speaking practice - ${topic}`,
    Prompt: `Talk about ${topic} in 1-2 minutes. Include examples and your opinion.`,
    Hint: "Use simple structure first, then add details and connectors.",
  };

  speakingCache.set(exercise.ExerciseId, exercise);
  return exercise;
}

function scoreByLength(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 120) return 92;
  if (words >= 90) return 84;
  if (words >= 60) return 76;
  if (words >= 30) return 68;
  return 55;
}

export function analyzeSpeaking(input: { ExerciseId: string; AudioData: string }) {
  const exercise = speakingCache.get(input.ExerciseId);
  if (!exercise) {
    return null;
  }

  const text = (input.AudioData || "").trim();
  const overall = scoreByLength(text || "short response");

  return {
    TranscribedText: text,
    OverallScore: overall,
    PronunciationScore: Math.max(40, overall - 4),
    GrammarScore: Math.max(40, overall - 2),
    VocabularyScore: Math.max(40, overall - 3),
    FluencyScore: Math.max(40, overall - 1),
    GrammarErrors: [],
    OverallFeedback: "Continue practicing with clearer structure and richer vocabulary.",
    Suggestions: [
      "Use linking words like however, therefore, and for example.",
      "Give one specific example for each main point.",
      "Speak in complete sentences and control your pace.",
    ],
  };
}
