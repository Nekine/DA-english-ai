import { randomUUID } from "node:crypto";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";
import { logger } from "../utils/logger";

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

const MIN_SPEAKING_PROMPT_WORDS = 70;
const MAX_SPEAKING_PROMPT_WORDS = 220;
const MAX_SPEAKING_GENERATE_ATTEMPTS = 3;
const MAX_SPEAKING_ANALYZE_ATTEMPTS = 2;
const MIN_ANALYZABLE_TRANSCRIPT_WORDS = 8;

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return "";
}

function readFirstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const parsed = Number(record[key]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function readFirstArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
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

function isTemplateSpeakingPrompt(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return /you\s+should\s+speak\s+for|speak\s+for\s+about\s+1-?2\s+minutes|here\s+is\s+your\s+task|this\s+speaking\s+task/.test(normalized);
}

function isGenericHint(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return /use\s+clear\s+structure|give\s+examples|transition\s+words|speak\s+clearly/.test(normalized);
}

function normalizeSpeakingGeneratePayload(payload: SpeakingGenerateAiPayload | unknown): {
  title: string;
  prompt: string;
  hint: string;
} {
  const root = asRecord(payload);
  if (!root) {
    return { title: "", prompt: "", hint: "" };
  }

  const contentRoot = asRecord(root.data) ?? asRecord(root.result) ?? root;
  return {
    title: readFirstString(contentRoot, ["title", "Title"]),
    prompt: readFirstString(contentRoot, ["prompt", "Prompt", "task", "Task", "content", "Content"]),
    hint: readFirstString(contentRoot, ["hint", "Hint", "tips", "Tips", "tip", "Tip"]),
  };
}

function normalizeSpeakingAnalyzePayload(payload: SpeakingAnalyzeAiPayload | unknown): SpeakingAnalyzeAiPayload {
  const root = asRecord(payload);
  if (!root) {
    return {};
  }

  const contentRoot = asRecord(root.data) ?? asRecord(root.result) ?? root;

  const overallScore = readFirstNumber(contentRoot, ["overallScore", "OverallScore", "score", "Score"]);
  const pronunciationScore = readFirstNumber(contentRoot, ["pronunciationScore", "PronunciationScore"]);
  const grammarScore = readFirstNumber(contentRoot, ["grammarScore", "GrammarScore"]);
  const vocabularyScore = readFirstNumber(contentRoot, ["vocabularyScore", "VocabularyScore"]);
  const fluencyScore = readFirstNumber(contentRoot, ["fluencyScore", "FluencyScore"]);
  const overallFeedback = readFirstString(contentRoot, ["overallFeedback", "OverallFeedback", "feedback", "Feedback"]);
  const suggestions = readFirstArray(contentRoot, ["suggestions", "Suggestions", "tips", "Tips"])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  const grammarErrors = readFirstArray(contentRoot, ["grammarErrors", "GrammarErrors", "errors", "Errors"]) as SpeakingGrammarErrorAiPayload[];

  return {
    ...(overallScore !== undefined ? { overallScore } : {}),
    ...(pronunciationScore !== undefined ? { pronunciationScore } : {}),
    ...(grammarScore !== undefined ? { grammarScore } : {}),
    ...(vocabularyScore !== undefined ? { vocabularyScore } : {}),
    ...(fluencyScore !== undefined ? { fluencyScore } : {}),
    ...(overallFeedback ? { overallFeedback } : {}),
    ...(suggestions.length > 0 ? { suggestions } : {}),
    ...(grammarErrors.length > 0 ? { grammarErrors } : {}),
  };
}

function ensureMeaningfulFeedback(feedback: string, transcript: string, fallback: string): string {
  const cleaned = feedback.trim();
  if (!cleaned) {
    return fallback;
  }

  const generic = /good\s+job|keep\s+practicing|continue\s+practicing|ban\s+da\s+lam\s+tot/.test(cleaned.toLowerCase());
  if (generic && transcript.trim().length > 0) {
    return `${cleaned} Để tốt hơn, hãy bổ sung ví dụ cụ thể và liên kết ý bằng cụm từ nối như "however" hoặc "for example".`;
  }

  return cleaned;
}

function ensureMeaningfulSuggestions(suggestions: string[], fallback: string[]): string[] {
  const cleaned = suggestions.map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 6);
  if (cleaned.length === 0) {
    return fallback;
  }

  const genericCount = cleaned.filter((item) => /keep\s+practicing|speak\s+clearly|improve\s+grammar|practice\s+more/i.test(item)).length;
  if (genericCount >= Math.ceil(cleaned.length / 2)) {
    return fallback;
  }

  return cleaned;
}

function buildSpeakingGenerateUserPrompt(input: {
  topic: string;
  levelLabel: string;
  previousIssues?: string[];
}): string {
  const parts = [
    `Topic: ${input.topic}`,
    `English level: ${input.levelLabel}`,
    "Generate one concrete speaking task for 1-2 minutes with specific details and clear context.",
    `Prompt length: ${MIN_SPEAKING_PROMPT_WORDS}-${MAX_SPEAKING_PROMPT_WORDS} words.`,
    "Do NOT output generic template instructions (e.g., 'You should speak for 1-2 minutes...').",
    "Prompt must include practical details such as scenario, goals, and points to cover.",
    "Hint must be specific to this topic, not a generic study tip.",
    "Return JSON only.",
  ];

  if (input.previousIssues && input.previousIssues.length > 0) {
    parts.push(`Previous output was invalid. Fix: ${input.previousIssues.join("; ")}.`);
  }

  return parts.join("\n");
}

function buildHintFromPrompt(prompt: string): string {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("past") || lowered.includes("last")) {
    return "Sử dụng quá khứ đơn cho sự kiện đã xảy ra và nêu thêm bài học rút ra.";
  }

  if (lowered.includes("future") || lowered.includes("plan")) {
    return "Nêu rõ kế hoạch theo thứ tự: mục tiêu, hành động, và kết quả mong đợi.";
  }

  return "Trả lời theo cấu trúc mở đầu - 2 ý chính có ví dụ cụ thể - kết luận ngắn.";
}

function scoreByLength(text: string): number {
  const words = getWordCount(text);
  if (words >= 120) return 92;
  if (words >= 90) return 84;
  if (words >= 60) return 76;
  if (words >= 30) return 68;
  return 55;
}

function hasMeaningfulTranscript(transcript: string): boolean {
  const words = getWordCount(transcript);
  if (words < MIN_ANALYZABLE_TRANSCRIPT_WORDS) {
    return false;
  }

  const tokens = transcript
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  const uniqueRatio = new Set(tokens).size / tokens.length;
  return uniqueRatio >= 0.35;
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

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getProviderApiKey(provider: AiProvider): string {
  const key =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.XAI_API_KEY;

  return typeof key === "string" ? key.trim() : "";
}

function getTranscriptionBaseUrl(provider: AiProvider): string {
  if (provider === "openai") {
    return normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1");
  }

  if (provider === "gemini") {
    return normalizeBaseUrl(process.env.GEMINI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1");
  }

  return normalizeBaseUrl(process.env.XAI_BASE_URL?.trim() || "https://api-v2.shopaikey.com/v1");
}

function getTranscriptionModel(provider: AiProvider): string {
  if (provider === "openai") {
    return process.env.OPENAI_STT_MODEL?.trim() || "gpt-4o-mini-transcribe";
  }

  if (provider === "gemini") {
    return process.env.GEMINI_STT_MODEL?.trim() || "gpt-4o-mini-transcribe";
  }

  return process.env.XAI_STT_MODEL?.trim() || "gpt-4o-mini-transcribe";
}

function parseAudioDataUrl(audioData: string): { mimeType: string; extension: string; buffer: Buffer } | null {
  const trimmed = String(audioData ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^data:(audio\/[a-zA-Z0-9.+-]+(?:;codecs=[^;,]+)?);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !match[1] || !match[2]) {
    return null;
  }

  const mimeType = String(match[1]).split(";")[0] || "audio/webm";

  let buffer: Buffer;
  try {
    buffer = Buffer.from(String(match[2]), "base64");
  } catch {
    return null;
  }

  if (buffer.length === 0) {
    return null;
  }

  const extension = mimeType.split("/")[1]?.split("+")[0] || "webm";
  return { mimeType, extension, buffer };
}

async function transcribeAudioWithProvider(audioData: string, provider: AiProvider): Promise<string> {
  const parsedAudio = parseAudioDataUrl(audioData);
  if (!parsedAudio) {
    return "";
  }

  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return "";
  }

  const baseUrl = getTranscriptionBaseUrl(provider);
  const model = getTranscriptionModel(provider);

  const formData = new FormData();
  const audioBytes = new Uint8Array(parsedAudio.buffer);
  formData.append("file", new Blob([audioBytes], { type: parsedAudio.mimeType }), `recording.${parsedAudio.extension}`);
  formData.append("model", model);
  formData.append("response_format", "json");

  try {
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const raw = await response.text();
    if (!response.ok) {
      logger.warn("Speaking transcription request failed", {
        provider,
        statusCode: response.status,
        bodySnippet: raw.slice(0, 240),
      });
      return "";
    }

    try {
      const payload = JSON.parse(raw) as unknown;
      const record = asRecord(payload);
      if (record) {
        return readFirstString(record, ["text", "transcript", "TranscribedText", "output_text"]);
      }
    } catch {
      // Some providers may return plain text despite response_format request.
    }

    return raw.trim();
  } catch (error) {
    logger.warn("Speaking transcription call failed", {
      provider,
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

async function transcribeAudioWithFallback(audioData: string, preferredProvider: AiProvider): Promise<string> {
  const candidates: AiProvider[] =
    preferredProvider === "openai"
      ? ["openai", "gemini", "xai"]
      : preferredProvider === "gemini"
        ? ["gemini", "openai", "xai"]
        : ["xai", "openai", "gemini"];

  for (const provider of candidates) {
    const transcript = await transcribeAudioWithProvider(audioData, provider);
    if (hasMeaningfulTranscript(transcript)) {
      logger.info("Speaking transcription succeeded", {
        requestedProvider: preferredProvider,
        transcriptionProvider: provider,
        transcriptWords: getWordCount(transcript),
      });
      return transcript;
    }
  }

  return "";
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
  let previousIssues: string[] = [];

  for (let attempt = 1; attempt <= MAX_SPEAKING_GENERATE_ATTEMPTS; attempt += 1) {
    const userPrompt = buildSpeakingGenerateUserPrompt({
      topic,
      levelLabel,
      ...(previousIssues.length > 0 ? { previousIssues } : {}),
    });

    const generated = await generateJsonFromProvider<SpeakingGenerateAiPayload>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.6,
    });

    const normalized = normalizeSpeakingGeneratePayload(generated);
    const prompt = normalized.prompt;
    const promptWords = getWordCount(prompt);
    const hint = !normalized.hint || isGenericHint(normalized.hint) ? buildHintFromPrompt(prompt) : normalized.hint;

    const issues: string[] = [];
    if (!prompt) {
      issues.push("Missing prompt");
    } else {
      if (isTemplateSpeakingPrompt(prompt)) {
        issues.push("Prompt is generic template, not a concrete speaking scenario");
      }
      if (promptWords < MIN_SPEAKING_PROMPT_WORDS || promptWords > MAX_SPEAKING_PROMPT_WORDS) {
        issues.push(`Prompt length must be ${MIN_SPEAKING_PROMPT_WORDS}-${MAX_SPEAKING_PROMPT_WORDS} words`);
      }
    }

    if (issues.length === 0) {
      return {
        Title: normalized.title || `Speaking practice - ${topic}`,
        Prompt: prompt,
        Hint: hint,
        Provider: provider,
      };
    }

    logger.warn("Speaking generate payload validation failed", {
      provider,
      attempt,
      maxAttempts: MAX_SPEAKING_GENERATE_ATTEMPTS,
      issues,
      promptWords,
    });

    previousIssues = issues;
  }

  throw new Error("Speaking AI returned invalid task format after retries. Please generate again.");
}

function isGenericVietnameseText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return /can\s+dieu\s+chinh|can\s+cai\s+thien|improve\s+this|better\s+sentence|co\s+the\s+tot\s+hon/.test(normalized);
}

function buildGrammarErrorExplanation(errorText: string, correction: string, description: string): string {
  const correctionText = correction.trim();
  const base = correctionText
    ? `Cụm "${errorText}" nên đổi thành "${correctionText}".`
    : `Cụm "${errorText}" chưa tự nhiên trong ngữ cảnh này.`;

  if (description.trim()) {
    return `${base} Lý do: ${description.trim()}.`;
  }

  return `${base} Điều này giúp câu rõ nghĩa và đúng ngữ pháp hơn.`;
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
      const errorRecord = asRecord(item);
      if (!errorRecord) {
        return null;
      }

      const errorText = readFirstString(errorRecord, ["ErrorText", "errorText", "text", "Text"]);
      if (!errorText) {
        return null;
      }

      const description = readFirstString(errorRecord, ["Description", "description", "Reason", "reason"]);
      const correction = readFirstString(errorRecord, ["Correction", "correction", "Fix", "fix"]);
      const explanationRaw = readFirstString(errorRecord, ["ExplanationInVietnamese", "explanationInVietnamese", "Explanation", "explanation"]);
      const explanation = isGenericVietnameseText(explanationRaw)
        ? buildGrammarErrorExplanation(errorText, correction, description)
        : explanationRaw;

      const startIndexRaw = readFirstNumber(errorRecord, ["StartIndex", "startIndex", "start"]);
      const startIndex = Number.isInteger(startIndexRaw) ? Number(startIndexRaw) : 0;
      const endIndexRaw = readFirstNumber(errorRecord, ["EndIndex", "endIndex", "end"]);
      const endIndex = Number.isInteger(endIndexRaw)
        ? Math.max(startIndex, Number(endIndexRaw))
        : Math.max(startIndex, errorText.length - 1);

      return {
        StartIndex: startIndex,
        EndIndex: endIndex,
        ErrorText: errorText,
        ErrorType: readFirstString(errorRecord, ["ErrorType", "errorType", "type", "Type"]) || "Grammar",
        Description: description || "Có thể cải thiện cấu trúc câu.",
        Correction: correction,
        ExplanationInVietnamese: explanation,
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
    TranscribedText: transcript || "Không có transcript được ghi nhận. Vui lòng bật nhận diện giọng nói và thử lại.",
    OverallScore: overall,
    PronunciationScore: Math.max(35, overall - 4),
    GrammarScore: Math.max(35, overall - 2),
    VocabularyScore: Math.max(35, overall - 3),
    FluencyScore: Math.max(35, overall - 1),
    GrammarErrors: [],
    OverallFeedback: transcript
      ? "Bạn đang đi đúng hướng. Hãy tiếp tục luyện tập với cấu trúc rõ ràng hơn và vốn từ phong phú hơn."
      : "Không có transcript khả dụng. Hãy nói gần micro hơn và giữ tốc độ nói ổn định.",
    Suggestions: transcript
      ? [
          "Dùng từ nối như however, therefore, for example để mạch nói tự nhiên hơn.",
          "Mỗi ý chính nên có ít nhất một ví dụ cụ thể.",
          "Nói bằng câu hoàn chỉnh và kiểm soát tốc độ nói.",
        ]
      : [
          "Cấp quyền micro trước khi ghi âm.",
          "Nói rõ ràng bằng câu ngắn trước, sau đó mở rộng ý.",
          "Thử trình duyệt khác nếu live transcript không hoạt động.",
        ],
  };
}

function buildInsufficientSpeechAnalysis(transcript: string) {
  return {
    TranscribedText: transcript || "Không phát hiện nội dung nói từ bản ghi âm.",
    OverallScore: 8,
    PronunciationScore: 8,
    GrammarScore: 8,
    VocabularyScore: 8,
    FluencyScore: 8,
    GrammarErrors: [],
    OverallFeedback:
      "Không đủ dữ liệu giọng nói để đánh giá chính xác. Hệ thống không ghi nhận được nội dung nói có ý nghĩa từ bản ghi âm.",
    Suggestions: [
      "Ghi âm lại trong không gian yên tĩnh, nói rõ ràng tối thiểu 20-30 giây.",
      "Kiểm tra quyền micro và đảm bảo biểu tượng ghi âm đang hoạt động.",
      "Nói theo đề bài với câu đầy đủ và ví dụ cụ thể để hệ thống phân tích chính xác hơn.",
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

  const provider = resolveProvider(input.AiModel, exercise.Provider);
  let transcript = extractTranscript(input.AudioData, input.TranscribedText);

  if (!hasMeaningfulTranscript(transcript)) {
    const transcribedFromAudio = await transcribeAudioWithFallback(input.AudioData, provider);
    if (hasMeaningfulTranscript(transcribedFromAudio)) {
      transcript = transcribedFromAudio;
    }
  }

  const transcriptWords = getWordCount(transcript);

  if (!hasMeaningfulTranscript(transcript)) {
    logger.warn("Speaking analyze skipped due to insufficient transcript", {
      exerciseId: input.ExerciseId,
      transcriptWords,
      audioDataLength: String(input.AudioData ?? "").length,
      hasTranscribedText: typeof input.TranscribedText === "string" && input.TranscribedText.trim().length > 0,
    });

    return buildInsufficientSpeechAnalysis(transcript);
  }

  const baselineOverall = scoreByLength(transcript);
  const fallback = buildFallbackAnalysis(transcript, baselineOverall);

  const systemPrompt = loadPromptTemplate("speaking-analyze.system.prompt.txt");
  const userPrompt = [
    `Topic: ${exercise.Topic}`,
    `English level: ${levelMap[exercise.EnglishLevel] ?? `Level ${exercise.EnglishLevel}`}`,
    `Prompt shown to learner: ${exercise.Prompt}`,
    `Transcript word count: ${transcriptWords}`,
    `Audio payload length: ${String(input.AudioData ?? "").length}`,
    `Transcript: ${transcript || "[No transcript captured]"}`,
    "Return strict JSON only.",
    "Write overallFeedback, suggestions, and ExplanationInVietnamese in natural Vietnamese WITH full diacritics.",
    "Evaluate strictly from transcript evidence only. Do not infer content that is not in transcript.",
    "If transcript is too short/unclear, assign low scores and explain insufficient evidence.",
    "GrammarErrors should include only meaningful issues; avoid empty or generic placeholders.",
    "Suggestions must be actionable and specific to this transcript and prompt.",
  ].join("\n");

  let normalized: SpeakingAnalyzeAiPayload | null = null;
  for (let attempt = 1; attempt <= MAX_SPEAKING_ANALYZE_ATTEMPTS; attempt += 1) {
    try {
      const generated = await generateJsonFromProvider<SpeakingAnalyzeAiPayload>({
        provider,
        systemPrompt,
        userPrompt,
        temperature: 0.45,
      });
      normalized = normalizeSpeakingAnalyzePayload(generated);
      break;
    } catch (error) {
      logger.warn("Speaking analyze AI parse failed", {
        provider,
        attempt,
        maxAttempts: MAX_SPEAKING_ANALYZE_ATTEMPTS,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!normalized) {
    return fallback;
  }

  const suggestions = ensureMeaningfulSuggestions(normalized.suggestions ?? [], fallback.Suggestions);

  return {
    TranscribedText: transcript || fallback.TranscribedText,
    OverallScore: clampScore(normalized.overallScore, fallback.OverallScore),
    PronunciationScore: clampScore(normalized.pronunciationScore, fallback.PronunciationScore),
    GrammarScore: clampScore(normalized.grammarScore, fallback.GrammarScore),
    VocabularyScore: clampScore(normalized.vocabularyScore, fallback.VocabularyScore),
    FluencyScore: clampScore(normalized.fluencyScore, fallback.FluencyScore),
    GrammarErrors: normalizeGrammarErrors(normalized.grammarErrors),
    OverallFeedback: ensureMeaningfulFeedback(normalized.overallFeedback ?? "", transcript, fallback.OverallFeedback),
    Suggestions: suggestions,
  };
}
