import { apiService } from './api';

export type ToeicPartStatus = 'pending' | 'ready' | 'failed';
export type ExamStatus = 'generating' | 'ready' | 'failed';

export interface TestExamOption {
  label: string;
  value: string;
  content: string;
}

export interface TestExamQuestion {
  questionId: string;
  questionNumber: number;
  prompt: string;
  options: TestExamOption[];
  correctAnswer: string;
  explanation: string;
  audioText?: string;
  audioUrl?: string;
}

export interface TestExamSummary {
  testId: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  status: ExamStatus;
  readyPartCount: number;
  totalPartCount: number;
  questionCount: number;
  createdAt: string;
}

export interface TestExamPart {
  partNumber: number;
  partTitle: string;
  description: string;
  isListening: boolean;
  status: ToeicPartStatus;
  audioText?: string;
  audioUrl?: string;
  questions: TestExamQuestion[];
  errorMessage?: string;
}

export interface TestExamDetail {
  testId: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  isRealExamMode: boolean;
  createdAt: string;
  updatedAt: string;
  status: ExamStatus;
  generation: {
    currentPart: number;
    completedParts: number;
    totalParts: number;
    message: string;
  };
  parts: TestExamPart[];
}

export interface CreateTestExamPayload {
  Topic?: string;
  SuggestedTopic?: string;
  IsRealExamMode: boolean;
  IsFullTest: boolean;
  SelectedParts?: number[];
}

export const testExamService = {
  async getList(): Promise<TestExamSummary[]> {
    return apiService.get<TestExamSummary[]>('/api/TestExam/list');
  },

  async getSuggestedTopics(): Promise<string[]> {
    return apiService.get<string[]>('/api/TestExam/suggested-topics');
  },

  async getDetail(testId: string): Promise<TestExamDetail> {
    return apiService.get<TestExamDetail>(`/api/TestExam/${testId}`);
  },

  async create(payload: CreateTestExamPayload): Promise<TestExamSummary> {
    return apiService.post<TestExamSummary, CreateTestExamPayload>('/api/TestExam/create', payload);
  },
};
