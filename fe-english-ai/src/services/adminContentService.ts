import { apiService } from './api';

export interface AdminContentSummary {
  totalExercises: number;
  totalTests: number;
  exercisesCreated: {
    today: number;
    week: number;
    month: number;
  };
  testsCreated: {
    today: number;
    week: number;
    month: number;
  };
}

export interface AdminManagedExercise {
  id: number;
  title: string;
  exerciseType: string;
  partType: string;
  level: string;
  status: string;
  creatorUsername: string;
  createdAt: string;
  questionCount: number;
  attemptCount: number;
}

export interface AdminManagedTest {
  id: number;
  title: string;
  examType: string;
  totalParts: number;
  totalQuestions: number;
  durationMinutes: number;
  status: string;
  creatorUsername: string;
  createdAt: string;
  attemptCount: number;
}

class AdminContentService {
  async getSummary(): Promise<AdminContentSummary> {
    return apiService.get<AdminContentSummary>('/api/admin/content/summary');
  }

  async getExercises(): Promise<AdminManagedExercise[]> {
    return apiService.get<AdminManagedExercise[]>('/api/admin/content/exercises');
  }

  async getTests(): Promise<AdminManagedTest[]> {
    return apiService.get<AdminManagedTest[]>('/api/admin/content/tests');
  }

  async deleteExercise(id: number): Promise<void> {
    await apiService.delete(`/api/admin/content/exercises/${id}`);
  }

  async deleteTest(id: number): Promise<void> {
    await apiService.delete(`/api/admin/content/tests/${id}`);
  }
}

export const adminContentService = new AdminContentService();
