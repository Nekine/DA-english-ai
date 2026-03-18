import { apiService } from './api';

export enum AiModel {
  GeminiFlashLite = 0,
  Gpt5Preview = 1,
}

export enum SpeakingTopic {
  SelfIntroduction = 0,
  DailyLife = 1,
  HobbiesAndInterests = 2,
  TravelAndExploration = 3,
  WorkAndCareer = 4,
  EducationAndLearning = 5,
  TechnologyAndFuture = 6
}

export interface SpeakingExerciseParams {
  Topic: SpeakingTopic;
  EnglishLevel: number;
  CustomTopic?: string;
  AiModel: AiModel;
}

export interface SpeakingExerciseResult {
  ExerciseId: string;
  Topic: string;
  EnglishLevel: number;
  Title: string;
  Prompt: string;
  Hint: string;
  SampleAudio?: string;
}

export interface GrammarError {
  StartIndex: number;
  EndIndex: number;
  ErrorText: string;
  ErrorType: string;
  Description: string;
  Correction: string;
  ExplanationInVietnamese: string;
}

export interface SpeakingAnalysisResult {
  TranscribedText: string;
  OverallScore: number;
  PronunciationScore: number;
  GrammarScore: number;
  VocabularyScore: number;
  FluencyScore: number;
  GrammarErrors: GrammarError[];
  OverallFeedback: string;
  Suggestions: string[];
}

export interface AnalyzeSpeechPayload {
  ExerciseId: string;
  AudioData: string; // base64
  AiModel: AiModel;
}

class SpeakingService {
  async getTopics(): Promise<Record<number, string>> {
    return apiService.get<Record<number, string>>('/api/Speaking/Topics');
  }

  async getEnglishLevels(): Promise<Record<number, string>> {
    return apiService.get<Record<number, string>>('/api/Speaking/EnglishLevels');
  }

  async generateExercise(params: SpeakingExerciseParams): Promise<SpeakingExerciseResult> {
    return apiService.post<SpeakingExerciseResult>('/api/Speaking/Generate', params);
  }

  async analyzeSpeech(payload: AnalyzeSpeechPayload): Promise<SpeakingAnalysisResult> {
    return apiService.post<SpeakingAnalysisResult>('/api/Speaking/Analyze', payload);
  }
}

export const speakingService = new SpeakingService();
