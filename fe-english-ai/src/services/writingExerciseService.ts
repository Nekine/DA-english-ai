import apiService from './api';

export interface WritingExercise {
  id: number;
  title: string;
  content: string | null;
  questionsJson: string;
  correctAnswersJson: string;
  level: string | null;
  type: 'writing_essay' | 'writing_sentence';
  category: string | null;
  estimatedMinutes: number | null;
  timeLimit: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SentenceQuestion {
  questionOrder: number;
  vietnamesePrompt: string;
  correctAnswer: string;
  vocabularyHint?: string;
  grammarHint?: string;
}

export interface CreateWritingExerciseRequest {
  title: string;
  content?: string;
  questionsJson: string;
  correctAnswersJson: string;
  level?: string;
  type: 'writing_essay' | 'writing_sentence';
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
  createdBy?: number;
}

const writingExerciseService = {
  /**
   * Get all writing exercises, optionally filtered by type
   */
  getWritingExercises: async (type?: 'writing_essay' | 'writing_sentence'): Promise<WritingExercise[]> => {
    const params = type ? `?type=${type}` : '';
    const response = await apiService.get(`/api/writingexercise${params}`) as { success: boolean; exercises: WritingExercise[] };
    return response.exercises;
  },

  /**
   * Get a single writing exercise by ID
   */
  getWritingExerciseById: async (id: number): Promise<WritingExercise> => {
    const response = await apiService.get(`/api/writingexercise/${id}`) as { success: boolean; exercise: WritingExercise };
    return response.exercise;
  },

  /**
   * Create a new writing exercise
   */
  createWritingExercise: async (data: CreateWritingExerciseRequest): Promise<{ success: boolean; id: number }> => {
    const response = await apiService.post('/api/writingexercise', data) as { success: boolean; id: number; message: string };
    return { success: response.success, id: response.id };
  },

  /**
   * Update an existing writing exercise
   */
  updateWritingExercise: async (id: number, data: CreateWritingExerciseRequest): Promise<{ success: boolean }> => {
    const response = await apiService.put(`/api/writingexercise/${id}`, data) as { success: boolean; message: string };
    return { success: response.success };
  },

  /**
   * Delete a writing exercise
   */
  deleteWritingExercise: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiService.delete(`/api/writingexercise/${id}`) as { success: boolean; message: string };
    return { success: response.success };
  },

  /**
   * Parse questions JSON for sentence writing exercises
   */
  parseSentenceQuestions: (questionsJson: string): SentenceQuestion[] => {
    try {
      return JSON.parse(questionsJson) as SentenceQuestion[];
    } catch {
      return [];
    }
  },

  /**
   * Stringify sentence questions for saving
   */
  stringifySentenceQuestions: (questions: SentenceQuestion[]): string => {
    return JSON.stringify(questions);
  },
};

export default writingExerciseService;
