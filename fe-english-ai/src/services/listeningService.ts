import { apiService } from './api';

export enum AiModel {
  GeminiFlashLite = 0,
  Gpt5Preview = 1,
}

export enum ListeningGenre {
  DailyConversation = 1,
  NewsReport = 2,
  Storytelling = 3,
  AcademicLecture = 4,
  BusinessMeeting = 5,
}

export interface ListeningExerciseParams {
  Genre: ListeningGenre;
  EnglishLevel: number;
  TotalQuestions: number;
  CustomTopic?: string;
  AiModel: AiModel;
}

export interface ListeningQuestion {
  Question: string;
  Options: string[];
}

export interface ListeningExerciseResult {
  ExerciseId: string;
  Title: string;
  Genre: string;
  EnglishLevel: number;
  Transcript: string;
  AudioContent?: string;
  Questions: ListeningQuestion[];
}

export interface ListeningAnswerPayload {
  QuestionIndex: number;
  SelectedOptionIndex: number;
}

export interface ListeningGradeQuestionFeedback {
  QuestionIndex: number;
  Question: string;
  Options: string[];
  SelectedOptionIndex?: number | null;
  RightOptionIndex: number;
  ExplanationInVietnamese: string;
  IsCorrect: boolean;
}

export interface ListeningGradeResult {
  ExerciseId: string;
  Title: string;
  Transcript: string;
  AudioContent?: string;
  TotalQuestions: number;
  CorrectAnswers: number;
  Score: number;
  Questions: ListeningGradeQuestionFeedback[];
}

export interface ListeningExerciseSummary {
  ExerciseId: string;
  Title: string;
  Genre: string;
  EnglishLevel: number;
  TotalQuestions: number;
  CreatedAt: string;
  ExpiresAt: string;
}

export const listeningService = {
  async getGenres(): Promise<Record<number, string>> {
    return apiService.get<Record<number, string>>('/api/Listening/Genres');
  },

  async getEnglishLevels(): Promise<Record<number, string>> {
    return apiService.get<Record<number, string>>('/api/Assignment/GetEnglishLevels');
  },

  async generateExercise(params: ListeningExerciseParams): Promise<ListeningExerciseResult> {
    return apiService.post<ListeningExerciseResult, ListeningExerciseParams>('/api/Listening/Generate', params);
  },

  async gradeExercise(exerciseId: string, answers: ListeningAnswerPayload[]): Promise<ListeningGradeResult> {
    return apiService.post<ListeningGradeResult, { ExerciseId: string; Answers: ListeningAnswerPayload[] }>(
      '/api/Listening/Grade',
      { ExerciseId: exerciseId, Answers: answers }
    );
  },

  async getRecentExercises(take?: number): Promise<ListeningExerciseSummary[]> {
    const query = typeof take === 'number' ? `?take=${take}` : '';
    return apiService.get<ListeningExerciseSummary[]>(`/api/Listening/Recent${query}`);
  },
};
