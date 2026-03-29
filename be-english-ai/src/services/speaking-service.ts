import { randomUUID } from "node:crypto";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

type SpeakingExercise = {
  ExerciseId: string;
  Topic: string;
  EnglishLevel: number;
  Title: string;
  Prompt: string;
  Hint: string;
  Provider: AiProvider;
};

type SpeakingGenerateAiPayload = {
  title?: string;
  prompt?: string;
  hint?: string;
};

type SpeakingGrammarErrorAiPayload = {
  StartIndex?: number;
  EndIndex?: number;
  ErrorText?: string;
  ErrorType?: string;
  Description?: string;
  Correction?: string;
  ExplanationInVietnamese?: string;
};

type SpeakingAnalyzeAiPayload = {
  overallScore?: number;
  pronunciationScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  fluencyScore?: number;
  overallFeedback?: string;
  suggestions?: string[];
  grammarErrors?: SpeakingGrammarErrorAiPayload[];
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

const aiModelProviderMap: Record<number, AiProvider> = {
  0: "gemini",
  1: "openai",
  2: "xai",
};

export function getSpeakingTopics() {
  return topicMap;
}

export function getSpeakingEnglishLevels() {
  return levelMap;
}

function resolveProvider(aiModel: number | undefined, fallback: AiProvider = "openai"): AiProvider {
  const parsed = Number(aiModel);
  if (Number.isInteger(parsed) && aiModelProviderMap[parsed]) {
    return aiModelProviderMap[parsed] as AiProvider;
  }

  return fallback;
}

function clampScore(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scoreByLength(text: string): number {
  const words = getWordCount(text);
  if (words >= 120) return 92;
  if (words >= 90) return 84;
  if (words >= 60) return 76;
  if (words >= 30) return 68;
  return 55;
}

function extractTranscript(audioData: string, transcribedText?: string): string {
  const providedTranscript = String(transcribedText ?? "").trim();
  if (providedTranscript) {
    return providedTranscript;
  }

  const candidate = String(audioData ?? "").trim();
  if (!candidate) {
    return "";
  }

  if (/^data:audio\/.+;base64,/i.test(candidate)) {
    return "";
  }

  if (/^[a-zA-Z0-9+/=]+$/.test(candidate) && candidate.length > 80) {
    return "";
  }

  return candidate;
}

async function generateSpeakingFromAi(input: {
  Topic: number;
  EnglishLevel: number;
  CustomTopic?: string;
  AiModel?: number;
}): Promise<Pick<SpeakingExercise, "Title" | "Prompt" | "Hint" | "Provider">> {
  const topic = input.CustomTopic?.trim() || topicMap[input.Topic] || "General Topic";
  const levelLabel = levelMap[input.EnglishLevel] ?? `Level ${input.EnglishLevel}`;
  const provider = resolveProvider(input.AiModel);

  const systemPrompt = loadPromptTemplate("speaking-generate.system.prompt.txt");
  const userPrompt = [
    `Topic: ${topic}`,
    `English level: ${levelLabel}`,
    "Generate one speaking task and return JSON only.",
  ].join("\n");

  const generated = await generateJsonFromProvider<SpeakingGenerateAiPayload>({
    provider,
    systemPrompt,
    userPrompt,
    temperature: 0.6,
  });

  const title = String(generated.title ?? "").trim() || `Speaking practice - ${topic}`;
  const prompt = String(generated.prompt ?? "").trim();
  const hint = String(generated.hint ?? "").trim() || "Use clear structure, examples, and transition words.";

  if (!prompt) {
    throw new Error("Speaking AI response is missing prompt");
  }

  return {
    Title: title,
    Prompt: prompt,
    Hint: hint,
    Provider: provider,
  };
}

function normalizeGrammarErrors(rawErrors: unknown): Array<{
  StartIndex: number;
  EndIndex: number;
  ErrorText: string;
  ErrorType: string;
  Description: string;
  Correction: string;
  ExplanationInVietnamese: string;
}> {
  if (!Array.isArray(rawErrors)) {
    return [];
  }

  return rawErrors
    .map((item) => {
      const error = item as SpeakingGrammarErrorAiPayload;
      const errorText = String(error.ErrorText ?? "").trim();
      if (!errorText) {
        return null;
      }

      return {
        StartIndex: Number.isInteger(error.StartIndex) ? Number(error.StartIndex) : 0,
        EndIndex: Number.isInteger(error.EndIndex) ? Number(error.EndIndex) : Math.max(0, errorText.length - 1),
        ErrorText: errorText,
        ErrorType: String(error.ErrorType ?? "Grammar").trim() || "Grammar",
        Description: String(error.Description ?? "").trim() || "Can improve sentence structure.",
        Correction: String(error.Correction ?? "").trim() || "",
        ExplanationInVietnamese:
          String(error.ExplanationInVietnamese ?? "").trim() || "Can dieu chinh cau truc cau de tu nhien hon.",
      };
    })
    .filter((item): item is {
      StartIndex: number;
      EndIndex: number;
      ErrorText: string;
      ErrorType: string;
      Description: string;
      Correction: string;
      ExplanationInVietnamese: string;
    } => Boolean(item));
}

function buildFallbackAnalysis(transcript: string, overall: number) {
  return {
    TranscribedText: transcript || "No transcript captured. Please allow speech recognition and try again.",
    OverallScore: overall,
    PronunciationScore: Math.max(35, overall - 4),
    GrammarScore: Math.max(35, overall - 2),
    VocabularyScore: Math.max(35, overall - 3),
    FluencyScore: Math.max(35, overall - 1),
    GrammarErrors: [],
    OverallFeedback: transcript
      ? "Continue practicing with clearer structure and richer vocabulary."
      : "No transcript available. Speak closer to your microphone and keep your pace steady.",
    Suggestions: transcript
      ? [
          "Use linking words like however, therefore, and for example.",
          "Give one specific example for each main point.",
          "Speak in complete sentences and control your pace.",
        ]
      : [
          "Grant microphone permission before recording.",
          "Speak clearly in short sentences, then gradually extend ideas.",
          "Try another browser if live transcript is not supported.",
        ],
  };
}

export async function generateSpeakingExercise(input: {
  Topic: number;
  EnglishLevel: number;
  CustomTopic?: string;
  AiModel?: number;
}) {
  const topic = input.CustomTopic?.trim() || topicMap[input.Topic] || "General Topic";
  const generated = await generateSpeakingFromAi(input);
  const exercise: SpeakingExercise = {
    ExerciseId: randomUUID(),
    Topic: topic,
    EnglishLevel: Number(input.EnglishLevel) || 1,
    Title: generated.Title,
    Prompt: generated.Prompt,
    Hint: generated.Hint,
    Provider: generated.Provider,
  };

  speakingCache.set(exercise.ExerciseId, exercise);
  return {
    ExerciseId: exercise.ExerciseId,
    Topic: exercise.Topic,
    EnglishLevel: exercise.EnglishLevel,
    Title: exercise.Title,
    Prompt: exercise.Prompt,
    Hint: exercise.Hint,
  };
}

export async function analyzeSpeaking(input: {
  ExerciseId: string;
  AudioData: string;
  AiModel?: number;
  TranscribedText?: string;
}) {
  const exercise = speakingCache.get(input.ExerciseId);
  if (!exercise) {
    return null;
  }

  const transcript = extractTranscript(input.AudioData, input.TranscribedText);
  const baselineOverall = scoreByLength(transcript || "short response");
  const provider = resolveProvider(input.AiModel, exercise.Provider);
  const fallback = buildFallbackAnalysis(transcript, baselineOverall);

  const systemPrompt = loadPromptTemplate("speaking-analyze.system.prompt.txt");
  const userPrompt = [
    `Topic: ${exercise.Topic}`,
    `English level: ${levelMap[exercise.EnglishLevel] ?? `Level ${exercise.EnglishLevel}`}`,
    `Prompt shown to learner: ${exercise.Prompt}`,
    `Transcript: ${transcript || "[No transcript captured]"}`,
    "Return strict JSON only.",
  ].join("\n");

  let generated: SpeakingAnalyzeAiPayload | null = null;
  try {
    generated = await generateJsonFromProvider<SpeakingAnalyzeAiPayload>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.45,
    });
  } catch {
    return fallback;
  }

  if (!generated) {
    return fallback;
  }

  const suggestions = Array.isArray(generated.suggestions)
    ? generated.suggestions.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0).slice(0, 6)
    : [];

  return {
    TranscribedText: transcript || fallback.TranscribedText,
    OverallScore: clampScore(generated.overallScore, fallback.OverallScore),
    PronunciationScore: clampScore(generated.pronunciationScore, fallback.PronunciationScore),
    GrammarScore: clampScore(generated.grammarScore, fallback.GrammarScore),
    VocabularyScore: clampScore(generated.vocabularyScore, fallback.VocabularyScore),
    FluencyScore: clampScore(generated.fluencyScore, fallback.FluencyScore),
    GrammarErrors: normalizeGrammarErrors(generated.grammarErrors),
    OverallFeedback: String(generated.overallFeedback ?? "").trim() || fallback.OverallFeedback,
    Suggestions: suggestions.length > 0 ? suggestions : fallback.Suggestions,
  };
}
