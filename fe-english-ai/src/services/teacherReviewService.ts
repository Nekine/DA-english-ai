import { apiService } from './api';

export interface TeacherReview {
  completionId: number;
  exerciseId: number;
  exerciseTitle: string;
  exerciseType: string | null;
  exerciseCategory: string | null;
  originalScore: number | null;
  finalScore: number | null;
  reviewStatus: 'approved' | 'rejected' | 'needs_regrade';
  reviewNotes: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  confidenceScore: number | null;
  reviewerName: string;
  reviewerEmail: string | null;
}

export interface TeacherReviewDetail extends TeacherReview {
  userAnswersJson: string | null;
  questionsJson: string | null;
  correctAnswersJson: string | null;
}

export const teacherReviewService = {
  getMyReviews: async (userId: number): Promise<TeacherReview[]> => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/TeacherReview/my-reviews?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching teacher reviews:', error);
      throw error;
    }
  },

  getReviewDetail: async (completionId: number, userId: number): Promise<TeacherReviewDetail> => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/TeacherReview/detail/${completionId}?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch review detail: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching review detail:', error);
      throw error;
    }
  }
};
