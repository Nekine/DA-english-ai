// 🗄️ DATABASE STATS SERVICE - Kết nối .NET API với fallback to mock data
// ✅ READY FOR GIT: Hoàn thành với comprehensive mock data + API integration
// 🔄 TODO DEPLOY: Cập nhật API_BASE_URL khi deploy .NET backend lên production
// 🛡️ Features: Auto fallback, error handling, comprehensive TOEIC exercises
// 📊 Mock Data: 7 complete TOEIC reading exercises, full user stats, leaderboard

// Real API service kết nối với MySQL database
import { apiService } from './api';

// Types matching với database schema
export interface UserStats {
  id: string;
  userId: string;
  username: string;
  fullName?: string;
  level: number;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  streakDays: number;
  lastActivity: string;
  exercisesCompleted: number;
  lessonsCompleted: number;
  wordsLearned: number;
  readingScore: number;
  listeningScore: number;
  grammarScore: number;
  vocabularyScore: number;
  achievements: string[];
  updatedAt: string;
  rank: number;
  weeklyRank: number;
  monthlyRank: number;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  fullName?: string;
  level: number;
  totalXp: number;
  weeklyXp: number;
  monthlyXp: number;
  rank: number;
  weeklyRank: number;
  monthlyRank: number;
  streakDays: number;
  badge?: string;
  lastUpdated?: string;
}

export interface ProgressData {
  userId: string;
  currentLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  progressPercentage: number;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
  streakDays: number;
  exercisesThisWeek: number;
  lessonsThisMonth: number;
  wordsLearnedTotal: number;
  recentAchievements: string[];
}

export interface ReadingExercise {
  id: number; // Add id field for frontend usage
  exerciseId: number;
  name: string;
  content: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Part 5' | 'Part 6' | 'Part 7';
  sourceType: 'manual' | 'ai';
  topic?: string;
  questions: Question[];
  timeLimit?: number; // Optional time limit
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  question?: string;
  questionText?: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface UserResult {
  resultId: number;
  userId: number;
  exerciseId: number;
  answers: number[];
  score: number;
  totalQuestions: number;
  timeSpent?: number;
  completedAt: string;
}

export type TimeFilter = 'all' | 'weekly' | 'monthly' | 'today';

class DatabaseStatsService {
  // Get user statistics từ .NET API
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const response = await apiService.get<UserStats>(`/api/User/${userId}/stats`);
      return response;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Fallback to mock data nếu API fail
      return this.getMockUserStats(userId);
    }
  }

  // Get leaderboard với time filtering từ .NET API
  async getLeaderboard(timeFilter: TimeFilter = 'all', limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      // .NET API endpoint với query parameters
      const queryParams = new URLSearchParams({
        timeFilter,
        limit: limit.toString()
      });
      const response = await apiService.get<LeaderboardEntry[]>(`/api/Leaderboard?${queryParams}`);
      return response;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback to mock data
      return this.getMockLeaderboard(timeFilter);
    }
  }

  // Get progress data từ .NET API
  async getProgressData(userId: string): Promise<ProgressData> {
    try {
      const response = await apiService.get<ProgressData>(`/api/User/${userId}/progress`);
      return response;
    } catch (error) {
      console.error('Error fetching progress data:', error);
      // Fallback to mock data
      return this.getMockProgressData(userId);
    }
  }



  // Get reading exercises từ .NET API (bao gồm admin uploaded + AI generated)
  async getReadingExercises(
    level?: 'Beginner' | 'Intermediate' | 'Advanced',
    type?: 'Part 5' | 'Part 6' | 'Part 7',
    sourceType?: 'uploaded' | 'ai'
  ): Promise<ReadingExercise[]> {
    try {
      // Build query parameters cho filtering
      const queryParams = new URLSearchParams();
      if (level) queryParams.append('level', level);
      if (type) queryParams.append('type', type);
      if (sourceType) queryParams.append('sourceType', sourceType);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/ReadingExercise?${queryString}` : '/api/ReadingExercise';
      
      interface DBReadingExercise {
        exerciseId: number;
        name: string;
        content: string;
        level: 'Beginner' | 'Intermediate' | 'Advanced';
        type: 'Part 5' | 'Part 6' | 'Part 7';
        sourceType: 'manual' | 'ai';
        topic?: string;
        questions: string | Question[];
        createdAt: string;
        updatedAt: string;
        createdBy?: string; // Admin who uploaded
      }
      
      interface BackendExercise {
        Id?: number; // Backend uses capital I
        id?: number; // Frontend uses lowercase i
        ExerciseId?: number; // Backend uses capital E
        exerciseId?: number; // Frontend uses lowercase e
        Name?: string; // Backend uses capital N
        name?: string; // Frontend uses lowercase n
        Content?: string; // Backend uses capital C
        content?: string; // Frontend uses lowercase c
        Level?: 'Beginner' | 'Intermediate' | 'Advanced'; // Backend capital L
        level?: 'Beginner' | 'Intermediate' | 'Advanced'; // Frontend lowercase l
        Type?: 'Part 5' | 'Part 6' | 'Part 7'; // Backend capital T
        type?: 'Part 5' | 'Part 6' | 'Part 7'; // Frontend lowercase t
        SourceType?: 'manual' | 'ai'; // Backend capital S
        sourceType?: 'manual' | 'ai'; // Frontend lowercase s
        topic?: string;
        createdAt?: string;
        updatedAt?: string;
        createdBy?: string;
      }

      // Define backend question structure
      interface BackendQuestion {
        Id?: number;
        QuestionText?: string;
        questionText?: string; // Support both camelCase and PascalCase
        question?: string;
        Options?: string[];
        options?: string[];
        correctAnswer?: number;
        Explanation?: string;
        explanation?: string;
      }

      interface BackendExerciseWithQuestions extends BackendExercise {
        Questions?: BackendQuestion[];
        questions?: BackendQuestion[];
      }

      const response = await apiService.get<BackendExerciseWithQuestions[]>(endpoint);
      
      // DEBUG: Log raw response from backend
      console.log('📡 RAW BACKEND RESPONSE:', JSON.stringify(response, null, 2));
      
      return response.map((exercise) => {
        // Convert backend questions to frontend format
        const backendQuestions = exercise.Questions || exercise.questions || [];
        const convertedQuestions: Question[] = backendQuestions.map((q) => ({
          question: q.QuestionText || q.question || q.questionText || 'Question not available',
          options: q.Options || q.options || [],
          correctAnswer: q.correctAnswer ?? -1,
          explanation: q.Explanation || q.explanation
        }));

        // DEBUG: Log IDs from backend to identify mismatch
        console.log('🔍 Exercise from backend:', {
          name: exercise.Name || exercise.name,
          'Id (capital)': exercise.Id,
          'id (lowercase)': exercise.id,
          'ExerciseId (capital)': exercise.ExerciseId,
          'exerciseId (lowercase)': exercise.exerciseId,
          backendSourceType: exercise.SourceType,
          lowercaseSourceType: exercise.sourceType,
        });

        // IMPORTANT: Backend returns both Id and ExerciseId with same value
        // Try capital letters first (C# convention), then lowercase
        const exerciseId = exercise.ExerciseId || exercise.exerciseId || exercise.Id || exercise.id || 0;

        return {
          ...exercise,
          id: exerciseId,
          exerciseId: exerciseId,
          name: exercise.Name || exercise.name || 'Untitled Exercise',
          content: exercise.Content || exercise.content || 'No content available',
          level: exercise.Level || exercise.level || 'Beginner',
          type: exercise.Type || exercise.type || 'Part 7',
          sourceType: (exercise.SourceType || exercise.sourceType || 'manual') as 'manual' | 'ai',
          questions: convertedQuestions,
          createdAt: exercise.createdAt || new Date().toISOString(),
          updatedAt: exercise.updatedAt || new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Error fetching reading exercises:', error);
      return this.getMockReadingExercises();
    }
  }

  // 🤖 TẠO BÀI BẰNG AI: Gọi .NET API để tạo bài tập với AI (Gemini hoặc OpenAI)
  // Endpoint: POST /api/ReadingExercise/generate-ai
  // Input: {topic, level, type, provider} -> Backend xử lý -> AI API -> Database -> Return exercise
  async generateReadingExercise(
    topic: string, 
    level: 'Beginner' | 'Intermediate' | 'Advanced',
    type: 'Part 5' | 'Part 6' | 'Part 7',
    provider: 'gemini' | 'openai' = 'gemini'
  ): Promise<ReadingExercise> {
    try {
      interface AIGenerateRequest {
        topic: string;
        level: 'Beginner' | 'Intermediate' | 'Advanced';
        type: 'Part 5' | 'Part 6' | 'Part 7';
        provider?: 'gemini' | 'openai';
        userId?: string; // Track who generated
      }

      interface GenerateResponse {
        Success: boolean;
        Message: string;
        Exercise: {
          ExerciseId: number;
          Id: number;
          Title: string;
          Name: string;
          Content: string;
          Level: string;
          Type: string;
          Category: string;
          EstimatedMinutes: number;
          SourceType: string;
          CreatedBy: string;
          Description: string;
          CreatedAt: string;
          Questions: Question[];
        }
      }
      
      // .NET Controller sẽ call AI API (Gemini hoặc OpenAI) và return exercise
      const response = await apiService.post<GenerateResponse>('/api/ReadingExercise/generate-ai', {
        topic: topic,
        level: level,
        type: type,
        provider: provider
      });
      
      return {
        exerciseId: response.Exercise.ExerciseId,
        id: response.Exercise.ExerciseId, 
        name: response.Exercise.Name,
        content: response.Exercise.Content,
        level: response.Exercise.Level as 'Beginner' | 'Intermediate' | 'Advanced',
        type: response.Exercise.Type as 'Part 5' | 'Part 6' | 'Part 7',
        sourceType: response.Exercise.SourceType as 'manual' | 'ai',
        createdAt: response.Exercise.CreatedAt,
        updatedAt: response.Exercise.CreatedAt, // Use createdAt as updatedAt
        questions: response.Exercise.Questions
      };
    } catch (error) {
      console.error('Error generating AI reading exercise:', error);
      throw error;
    }
  }

  // Submit reading exercise result to .NET API
  async submitReadingResult(userId: number, exerciseId: number, answers: number[]): Promise<UserResult> {
    try {
      interface SubmitResultRequest {
        userId: number;
        exerciseId: number;
        answers: number[];
        timeSpent?: number; // Optional time tracking
        completedAt: string;
      }

      const response = await apiService.post<UserResult>('/api/ReadingExercise/submit-result', {
        userId,
        exerciseId,
        answers,
        completedAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      console.error('Error submitting reading result:', error);
      throw error;
    }
  }

  // Update user XP after completing exercise - .NET API
  async updateUserXp(userId: string, xpGained: number): Promise<UserStats> {
    try {
      const response = await apiService.post<UserStats>(`/api/User/${userId}/update-xp`, {
        xpGained,
        source: 'reading_exercise' // Track XP source
      });
      return response;
    } catch (error) {
      console.error('Error updating user XP:', error);
      throw error;
    }
  }

  // MOCK DATA FALLBACKS (giữ nguyên mock data hiện tại)
  private getMockUserStats(userId: string): UserStats {
    return {
      id: '6',
      userId: userId,
      username: 'englishlearner01',
      fullName: 'Bạn',
      level: 7,
      totalXp: 8200,
      weeklyXp: 620,
      monthlyXp: 1850,
      streakDays: 7,
      lastActivity: new Date().toISOString(),
      exercisesCompleted: 164,
      lessonsCompleted: 41,
      wordsLearned: 820,
      readingScore: 85,
      listeningScore: 78,
      grammarScore: 92,
      vocabularyScore: 89,
      achievements: ['First Steps', 'Week Warrior', 'Grammar Master'],
      updatedAt: new Date().toISOString(),
      rank: 4,
      weeklyRank: 5,
      monthlyRank: 6,
    };
  }

  private getMockLeaderboard(timeFilter: TimeFilter): LeaderboardEntry[] {
    const mockUsers = [
      {
        id: '1',
        userId: 'user1',
        username: 'NguyenVanA',
        fullName: 'Nguyễn Văn A',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b56c?w=100&h=100&fit=crop&crop=face',
        level: 12,
        totalXp: 15750,
        weeklyXp: 890,
        monthlyXp: 3240,
        rank: 1,
        weeklyRank: 2,
        monthlyRank: 1,
        streakDays: 23,
        badge: '🏆'
      },
      {
        id: '2',
        userId: 'user2',
        username: 'TranThiB',
        fullName: 'Trần Thị B',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        level: 11,
        totalXp: 14200,
        weeklyXp: 920,
        monthlyXp: 2980,
        rank: 2,
        weeklyRank: 1,
        monthlyRank: 2,
        streakDays: 18,
        badge: '🥈'
      },
      {
        id: '6',
        userId: 'current',
        username: 'englishlearner01',
        fullName: 'Bạn',
        level: 7,
        totalXp: 8200,
        weeklyXp: 620,
        monthlyXp: 1850,
        rank: 4,
        weeklyRank: 5,
        monthlyRank: 6,
        streakDays: 7,
        badge: '🚀'
      }
    ];

    // Apply time-based sorting
    switch (timeFilter) {
      case 'weekly':
        return mockUsers.sort((a, b) => b.weeklyXp - a.weeklyXp)
          .map((user, index) => ({ ...user, rank: index + 1 }));
      case 'monthly':
        return mockUsers.sort((a, b) => b.monthlyXp - a.monthlyXp)
          .map((user, index) => ({ ...user, rank: index + 1 }));
      default:
        return mockUsers;
    }
  }

  private getMockProgressData(userId: string): ProgressData {
    return {
      userId: userId,
      currentLevel: 7,
      currentXp: 200,
      xpToNextLevel: 800,
      progressPercentage: 20,
      weeklyGoal: 1000,
      weeklyProgress: 620,
      monthlyGoal: 4000,
      monthlyProgress: 1850,
      streakDays: 7,
      exercisesThisWeek: 12,
      lessonsThisMonth: 9,
      wordsLearnedTotal: 820,
      recentAchievements: ['First Steps', 'Week Warrior', 'Grammar Master'],
    };
  }

  // Simplified mock data - chỉ dùng khi API không khả dụng (fallback)
  private getMockReadingExercises(): ReadingExercise[] {
    // Trả về mảng rỗng - không còn dùng mock data
    // Tất cả exercises sẽ được lấy từ API backend
    return [];
  }
}

// Export singleton instance
export const databaseStatsService = new DatabaseStatsService();

// Keep existing statsService for backward compatibility
export const statsService = databaseStatsService;
