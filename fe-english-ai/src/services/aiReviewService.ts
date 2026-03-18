import { authService } from './authService';
import { apiService } from './api';

// Sử dụng Vite proxy thay vì hardcode URL
const API_BASE_URL = apiService.getBaseUrl();

export interface AIReviewStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  lowConfidence: number;
  avgConfidence: number;
  needsAttention: number;
}

export interface AIGradedSubmission {
  id: number;
  exerciseId: number;
  exerciseTitle: string;
  exerciseCode: string;
  exerciseLevel: string;
  exerciseType: string;
  aiGenerated: boolean;
  createdBy?: number;
  createdAt: string;
  sourceType?: string;
  totalQuestions: number;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_regrade';
  // Additional fields for submissions list
  userId?: number;
  userName?: string;
  userEmail?: string;
  originalScore?: number;
  finalScore?: number;
  completedAt?: string;
  reviewNotes?: string;
  confidenceScore?: number;
}

export const aiReviewService = {
  // Get statistics for dashboard cards
  async getStats(): Promise<AIReviewStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/AIReview/stats`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`API returned ${response.status}, using mock stats`);
        return this.getMockStats();
      }
      
      return await response.json();
    } catch (error) {
      console.warn('API call failed, using mock stats:', error);
      return this.getMockStats();
    }
  },

  getMockStats(): AIReviewStats {
    return {
      totalPending: 2,
      totalApproved: 0,
      totalRejected: 0,
      lowConfidence: 1,
      avgConfidence: 0.80,
      needsAttention: 1,
    };
  },

  // Get list of submissions
  async getSubmissions(
    status?: string,
    confidenceFilter?: string,
    search?: string
  ): Promise<AIGradedSubmission[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (confidenceFilter && confidenceFilter !== 'all') params.append('confidenceFilter', confidenceFilter);
      if (search) params.append('search', search);

      const url = `${API_BASE_URL}/api/AIReview/submissions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`API returned ${response.status}, using mock data`);
        return this.getMockSubmissions();
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('API call failed, using mock data:', error);
      return this.getMockSubmissions();
    }
  },

  // Mock data for development
  getMockSubmissions(): AIGradedSubmission[] {
    return [
      {
        id: 1,
        exerciseId: 1001,
        exerciseTitle: "Basic Grammar Quiz - Present Simple",
        exerciseCode: "GRAM-001",
        exerciseLevel: "A1",
        exerciseType: "grammar",
        aiGenerated: true,
        createdBy: 1,
        createdAt: new Date().toISOString(),
        sourceType: "ai_generated",
        totalQuestions: 10,
        reviewStatus: 'pending',
      },
      {
        id: 2,
        exerciseId: 1002,
        exerciseTitle: "Vocabulary Test - Daily Activities",
        exerciseCode: "VOC-002",
        exerciseLevel: "A2",
        exerciseType: "vocabulary",
        aiGenerated: true,
        createdBy: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        sourceType: "ai_generated",
        totalQuestions: 15,
        reviewStatus: 'pending',
      },
    ];
  },

  // Get detailed information for a specific submission
  async getSubmissionDetails(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/AIReview/submissions/${id}/details`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },

  // Update review with teacher adjustments
  async updateReview(id: number, reviewData: {
    submissionId: number;
    finalScore: number;
    reviewStatus: string;
    reviewNotes: string;
    questionAdjustments: Array<{
      questionNumber: number;
      newCorrectAnswer: string;
      teacherExplanation: string;
      newPoints: number;
      isCorrect: boolean;
    }>;
  }) {
    // Get current user ID from auth service
    const currentUser = authService.getUser();
    const reviewedBy = currentUser?.userId || 1; // Default to admin ID 1 if not found

    const payload = {
      ...reviewData,
      reviewedBy,
    };

    const response = await fetch(`${API_BASE_URL}/api/AIReview/submissions/${id}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },
};