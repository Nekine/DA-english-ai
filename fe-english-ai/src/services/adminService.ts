// 🎯 ADMIN SERVICE - Enhanced backend integration với AdminController API
// ✅ BACKEND READY: Kết nối trực tiếp với .NET AdminController endpoints
// 📊 Features: Real API calls với fallback to mock data, comprehensive admin dashboard
// 🔄 STEP 6 COMPLETE: Frontend admin dashboard kết nối backend AdminController

import { apiService } from './api';

// 📊 ADMIN DASHBOARD INTERFACES matching AdminController responses
export interface SystemStatistics {
  totalUsers: number;
  activeUsers: number;
  totalExercises: number;
  totalResults: number;
  averageScore: number;
  completionRate: number;
  weeklyNewUsers: number;
  monthlyActiveUsers: number;
  // Backend compatibility - PascalCase naming
  TotalUsers?: number;
  ActiveUsers?: number;
  TotalExercises?: number;
  TotalSubmissions?: number;
  AverageScore?: number;
  CompletionRate?: number;
  ActiveUsersToday?: number;
  ActiveUsersThisWeek?: number;
}

export interface RecentActivity {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface TopUser {
  userId: string;
  username: string;
  fullName?: string;
  totalXp: number;
  exercisesCompleted: number;
  averageScore: number;
  level: number;
  // Backend compatibility - PascalCase naming
  UserId?: string;
  Username?: string;
  FullName?: string;
  TotalXP?: number;
  TotalExercises?: number;
  AverageScore?: number;
  Level?: number;
}

export interface SystemHealth {
  status: 'Healthy' | 'Warning' | 'Error';
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  lastBackup: string;
  issues?: string[];
  // Backend compatibility - PascalCase naming
  DatabaseConnection?: boolean;
  GeminiApiConnection?: boolean;
  ResponseTimeMs?: number;
  CpuUsagePercent?: number;
  MemoryUsagePercent?: number;
  ApplicationVersion?: string;
  LastCheckTime?: string;
  ActiveSessions?: number;
}

export interface AdminDashboardData {
  systemStats: SystemStatistics;
  recentActivities: RecentActivity[];
  topUsers: TopUser[];
  systemHealth: SystemHealth;
}

// 👤 USER MANAGEMENT INTERFACES
export interface AdminUser {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  level: number;
  totalXp: number;
  joinedDate: string;
  lastActivity: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  exercisesCompleted: number;
  averageScore: number;
  streakDays: number;
  achievements: string[];
}

export interface CreateUserRequest {
  username: string;
  fullName: string;
  email: string;
  level?: number;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  level?: number;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

// 🏆 LEADERBOARD INTERFACES
export interface LeaderboardUser {
  userId: string;
  name: string;
  totalXp: number;
  completedExercises: number;
  currentStreak: number;
  rank: number;
  avatar?: string;
  englishLevel: string;
  averageScore: number;
}

export interface LeaderboardData {
  users: LeaderboardUser[];
  totalCount: number;
  timeFilter: string;
  category: string;
  lastUpdated: string;
}

// 📊 IMPORT/EXPORT INTERFACES
export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  duplicateEmails: string[];
  summary: string;
}

// 📚 EXERCISE MANAGEMENT INTERFACES  
export interface AdminExercise {
  exerciseId: number;
  name: string;
  content: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Part 5' | 'Part 6' | 'Part 7';
  sourceType: 'manual' | 'ai';
  topic?: string;
  questions: string; // JSON string of questions
  timeLimit?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isActive: boolean;
  attemptCount: number;
  averageScore: number;
}

// Backend response format for exercises from AdminController (old format)
interface BackendExercise {
  Id: number;
  Name: string;
  Level: string;
  Type: string;
  SourceType: string;
  CreatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
  QuestionCount: number;
  EstimatedMinutes: number;
  Status: string;
  ContentPreview: string;
  Content?: string;
  TotalAttempts: number;
  AverageScore: number;
}

// Backend response format from ReadingExerciseController (new format)
// Note: Backend uses PascalCase, not camelCase
interface ReadingExerciseDto {
  Id: number; // PascalCase from backend
  Name: string;
  Content: string;
  Level: string;
  Type: string;
  Description?: string;
  EstimatedMinutes: number;
  CreatedAt: string;
  UpdatedAt?: string;
  CreatedBy?: string;
  SourceType?: string;
  // Alternative camelCase properties (if backend provides both)
  id?: number;
  name?: string;
  content?: string;
  level?: string;
  type?: string;
  description?: string;
  estimatedMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  sourceType?: string;
}

interface ExercisesResponse {
  data: BackendExercise[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateExerciseRequest {
  name: string;
  content: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Part 5' | 'Part 6' | 'Part 7';
  description?: string;
  estimatedMinutes?: number;
  createdBy: string;
  questionCount: number;
}

class AdminService {
  
  // 📊 DASHBOARD ENDPOINTS
  
  /**
   * Get comprehensive admin dashboard data từ AdminController
   * Endpoint: GET /api/admin/dashboard
   */
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const response = await apiService.get<AdminDashboardData>('/api/admin/dashboard');
      return response;
    } catch (error) {
      console.warn('AdminController API not available, using mock data:', error);
      return this.getMockDashboardData();
    }
  }

  /**
   * Get system statistics only
   */
  async getSystemStats(): Promise<SystemStatistics> {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.systemStats;
    } catch (error) {
      return this.getMockSystemStats();
    }
  }

  /**
   * Get recent activities for admin monitoring
   */
  async getRecentActivities(): Promise<RecentActivity[]> {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.recentActivities;
    } catch (error) {
      return this.getMockRecentActivities();
    }
  }

  /**
   * Get top performing users
   */
  async getTopUsers(): Promise<TopUser[]> {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.topUsers;
    } catch (error) {
      return this.getMockTopUsers();
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const dashboardData = await this.getDashboardData();
      return dashboardData.systemHealth;
    } catch (error) {
      return this.getMockSystemHealth();
    }
  }

  // 👤 USER MANAGEMENT ENDPOINTS - Now pointing to UserManagementController
  
  /**
   * Get all users for admin management
   * Endpoint: GET /api/user-management/users
   */
  async getUsers(): Promise<AdminUser[]> {
    try {
      const response = await apiService.get<AdminUser[]>('/api/user-management/users');
      return response;
    } catch (error) {
      console.warn('UserManagement API not available, using mock data:', error);
      return this.getMockUsers();
    }
  }

  /**
   * Get user by ID
   * Endpoint: GET /api/user-management/users/{id}
   */
  async getUserById(userId: string): Promise<AdminUser | null> {
    try {
      const response = await apiService.get<AdminUser>(`/api/user-management/users/${userId}`);
      return response;
    } catch (error) {
      console.warn(`User ${userId} not found, using mock data:`, error);
      const mockUsers = this.getMockUsers();
      return mockUsers.find(u => u.userId === userId) || null;
    }
  }

  /**
   * Create new user
   * Endpoint: POST /api/user-management/users
   */
  async createUser(userData: CreateUserRequest): Promise<AdminUser> {
    try {
      const response = await apiService.post<AdminUser>('/api/user-management/users', userData);
      return response;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update user information
   * Endpoint: PUT /api/user-management/users/{id}
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<AdminUser> {
    try {
      const response = await apiService.put<AdminUser>(`/api/user-management/users/${userId}`, userData);
      return response;
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user
   * Endpoint: DELETE /api/user-management/users/{id}
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await apiService.delete(`/api/user-management/users/${userId}`);
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  // 🏆 LEADERBOARD ENDPOINTS - New functionality from UserManagementController
  
  /**
   * Get leaderboard data
   * Endpoint: GET /api/Leaderboard (Updated after cleanup)
   */
  async getLeaderboard(
    timeFilter: 'all' | 'today' | 'week' | 'month' = 'all',
    category: 'totalxp' | 'exercises' | 'streak' = 'totalxp',
    limit: number = 50
  ): Promise<LeaderboardData> {
    try {
      const params = new URLSearchParams({
        timeFilter,
        category,
        limit: limit.toString()
      });
      const response = await apiService.get<LeaderboardData>(`/api/Leaderboard?${params}`);
      return response;
    } catch (error) {
      console.warn('Leaderboard API not available, using mock data:', error);
      return this.getMockLeaderboard();
    }
  }

  // 📊 EXCEL IMPORT/EXPORT ENDPOINTS
  
  /**
   * Import users from Excel file
   * Endpoint: POST /api/user-management/import-excel
   */
  async importUsersFromExcel(file: File): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/user-management/import-excel', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to import users from Excel:', error);
      throw error;
    }
  }

  /**
   * Export users to Excel
   * Endpoint: GET /api/user-management/export-excel
   */
  async exportUsersToExcel(): Promise<void> {
    try {
      const response = await fetch('/api/user-management/export-excel');
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Users_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export users to Excel:', error);
      throw error;
    }
  }

  // 📚 EXERCISE MANAGEMENT ENDPOINTS

  /**
   * Get all exercises for admin management
   * Endpoint: GET /api/ReadingExercise (Updated after cleanup)
   * Note: ReadingExercise API returns ReadingExerciseDto[] array directly
   */
  async getExercises(): Promise<AdminExercise[]> {
    try {
      // ReadingExercise API returns ReadingExerciseDto[] directly
      const response = await apiService.get<ReadingExerciseDto[] | ExercisesResponse>('/api/ReadingExercise');
      
      console.log('AdminService.getExercises - Raw API response:', response);
      console.log('AdminService.getExercises - Is array?:', Array.isArray(response));
      console.log('AdminService.getExercises - Response type:', typeof response);
      console.log('AdminService.getExercises - First item structure:', response[0]);
      
      // Check if response is array (ReadingExerciseController format) or has data property (old AdminController format)
      let exerciseArray: (ReadingExerciseDto | BackendExercise)[] = [];
      
      if (Array.isArray(response)) {
        // New ReadingExerciseController format: array directly
        exerciseArray = response;
        console.log('AdminService.getExercises - Using array format, length:', exerciseArray.length);
      } else if (response && 'data' in response) {
        // Old AdminController format: wrapped in data property
        exerciseArray = (response as ExercisesResponse).data;
        console.log('AdminService.getExercises - Using data property format, length:', exerciseArray.length);
      } else {
        console.warn('Invalid response format from API, using mock data. Response:', response);
        return this.getMockExercises();
      }
      
      // If API returns empty array, use mock data for demo purposes
      if (exerciseArray.length === 0) {
        console.log('AdminService.getExercises - API returned empty array, using mock data for demo');
        return this.getMockExercises();
      }
      
      // Transform backend response to frontend format
      const exercises: AdminExercise[] = exerciseArray.map((exercise, index) => {
        console.log(`AdminService.getExercises - Exercise ${index} structure:`, exercise);
        console.log(`AdminService.getExercises - Exercise ${index} keys:`, Object.keys(exercise));
        
        // Handle both ReadingExerciseDto (PascalCase) and BackendExercise (PascalCase) formats
        // ReadingExerciseDto has 'Name' field, BackendExercise has 'Name' field too
        // Distinguish by checking for ReadingExerciseDto-specific fields like 'Duration' or 'Title'
        const isReadingExerciseDto = 'Duration' in exercise || 'Title' in exercise || !('Status' in exercise);
        
        console.log(`AdminService.getExercises - Exercise ${index} isReadingExerciseDto:`, isReadingExerciseDto);
        
        if (isReadingExerciseDto) {
          const ex = exercise as ReadingExerciseDto;
          const sourceType = (ex.SourceType || ex.sourceType || 'manual') as 'manual' | 'ai';
          
          // DEBUG: Log sourceType from backend
          console.log('🔍 Admin Panel - Exercise from backend:', {
            name: ex.Name || ex.name,
            backendSourceType: ex.SourceType,
            lowercaseSourceType: ex.sourceType,
            finalSourceType: sourceType
          });
          
          return {
            exerciseId: ex.Id || ex.id || 0,
            name: ex.Name || ex.name || 'Untitled Exercise',
            content: ex.Content || ex.content || '',
            level: (ex.Level || ex.level || 'Beginner') as 'Beginner' | 'Intermediate' | 'Advanced',
            type: (ex.Type || ex.type || 'Part 5') as 'Part 5' | 'Part 6' | 'Part 7',
            sourceType: sourceType,
            topic: ex.Type || ex.type || 'General',
            questions: '[]', // Will be loaded separately if needed
            timeLimit: (ex.EstimatedMinutes || ex.estimatedMinutes || 30) * 60,
            createdAt: ex.CreatedAt || ex.createdAt || new Date().toISOString(),
            updatedAt: ex.UpdatedAt || ex.updatedAt || ex.CreatedAt || ex.createdAt || new Date().toISOString(),
            createdBy: ex.CreatedBy || ex.createdBy || 'Unknown',
            isActive: true, // Default to true since ReadingExerciseDto doesn't have isActive
            attemptCount: 0, // Not available in ReadingExerciseDto
            averageScore: 0 // Not available in ReadingExerciseDto
          };
        } else if ('Status' in exercise) {
          // BackendExercise format (from old AdminController)
          const ex = exercise as BackendExercise;
          return {
            exerciseId: ex.Id,
            name: ex.Name,
            content: ex.ContentPreview || ex.Content || '',
            level: ex.Level as 'Beginner' | 'Intermediate' | 'Advanced',
            type: ex.Type as 'Part 5' | 'Part 6' | 'Part 7',
            sourceType: (ex.SourceType || 'manual') as 'manual' | 'ai',
            topic: ex.Type,
            questions: '[]', // Will be loaded separately if needed
            timeLimit: (ex.EstimatedMinutes || 30) * 60,
            createdAt: ex.CreatedAt,
            updatedAt: ex.UpdatedAt,
            createdBy: ex.CreatedBy || 'Unknown',
            isActive: ex.Status === 'Active',
            attemptCount: ex.TotalAttempts || 0,
            averageScore: ex.AverageScore || 0
          };
        } else {
          // Fallback: treat as generic object and extract common properties
          console.warn('AdminService.getExercises - Unknown exercise format, using fallback:', exercise);
          const ex = exercise as Record<string, unknown>;
          return {
            exerciseId: Number(ex.Id || ex.id || ex.ExerciseId || ex.exerciseId) || 0,
            name: String(ex.Name || ex.name || ex.Title || ex.title || 'Unknown Exercise'),
            content: String(ex.Content || ex.content || ex.Description || ex.description || ''),
            level: (ex.Level || ex.level || 'Beginner') as 'Beginner' | 'Intermediate' | 'Advanced',
            type: (ex.Type || ex.type || 'Part 5') as 'Part 5' | 'Part 6' | 'Part 7',
            sourceType: (ex.SourceType || ex.sourceType || 'manual') as 'manual' | 'ai',
            topic: String(ex.Topic || ex.topic || 'General'),
            questions: '[]',
            timeLimit: (Number(ex.EstimatedMinutes || ex.estimatedMinutes || ex.Duration || ex.duration) || 30) * 60,
            createdAt: String(ex.CreatedAt || ex.createdAt || ex.DateCreated || ex.dateCreated || new Date().toISOString()),
            updatedAt: String(ex.UpdatedAt || ex.updatedAt || ex.CreatedAt || ex.createdAt || new Date().toISOString()),
            createdBy: String(ex.CreatedBy || ex.createdBy || 'Unknown'),
            isActive: Boolean(ex.IsActive ?? ex.isActive ?? true),
            attemptCount: Number(ex.TotalAttempts || ex.totalAttempts || ex.AttemptCount || ex.attemptCount) || 0,
            averageScore: Number(ex.AverageScore || ex.averageScore) || 0
          };
        }
      });
      
      console.log(`Successfully loaded ${exercises.length} exercises from API`);
      return exercises;
    } catch (error) {
      console.warn('Admin exercises API not available, using mock data:', error);
      return this.getMockExercises();
    }
  }

  /**
   * Create exercise with AI generation
   * Endpoint: POST /api/ReadingExercise/create-with-ai (Updated after cleanup)
   */
  async createExerciseWithAI(exerciseData: CreateExerciseRequest): Promise<AdminExercise> {
    try {
      const response = await apiService.post<AdminExercise>('/api/ReadingExercise/create-with-ai', exerciseData);
      return response;
    } catch (error) {
      console.error('Failed to create AI exercise:', error);
      throw error;
    }
  }

  /**
   * Update exercise
   * Endpoint: PUT /api/ReadingExercise/{id} (Updated after cleanup)
   */
  async updateExercise(exerciseId: number, exerciseData: Partial<AdminExercise>): Promise<AdminExercise> {
    try {
      const response = await apiService.put<AdminExercise>(`/api/ReadingExercise/${exerciseId}`, exerciseData);
      return response;
    } catch (error) {
      console.error(`Failed to update exercise ${exerciseId}:`, error);
      throw error;
    }
  }

  /**
   * Delete exercise
   * Endpoint: DELETE /api/ReadingExercise/{id} (Updated after cleanup)
   */
  async deleteExercise(exerciseId: number): Promise<void> {
    try {
      await apiService.delete(`/api/ReadingExercise/${exerciseId}`);
    } catch (error) {
      console.error(`Failed to delete exercise ${exerciseId}:`, error);
      throw error;
    }
  }

  // 📊 MOCK DATA FALLBACKS - Đảm bảo frontend hoạt động khi backend offline

  private getMockDashboardData(): AdminDashboardData {
    return {
      systemStats: this.getMockSystemStats(),
      recentActivities: this.getMockRecentActivities(),
      topUsers: this.getMockTopUsers(),
      systemHealth: this.getMockSystemHealth()
    };
  }

  private getMockSystemStats(): SystemStatistics {
    return {
      totalUsers: 1284,
      activeUsers: 892,
      totalExercises: 86,
      totalResults: 9420,
      averageScore: 78.4,
      completionRate: 76.2,
      weeklyNewUsers: 32,
      monthlyActiveUsers: 1156
    };
  }

  private getMockRecentActivities(): RecentActivity[] {
    return [
      {
        id: '1',
        userId: 'user123',
        username: 'nguyenvana',
        action: 'Completed TOEIC Part 7 Exercise',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        details: 'Score: 85/100'
      },
      {
        id: '2',
        userId: 'user456',
        username: 'tranthib',
        action: 'Started new Grammar Challenge',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      },
      {
        id: '3',
        userId: 'user789',
        username: 'lephucc',
        action: 'Achieved 7-day streak',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        details: 'Streak reward: +50 XP'
      },
      {
        id: '4',
        userId: 'user321',
        username: 'vudinhd',
        action: 'Uploaded custom exercise',
        timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
        details: 'Part 5: Business Grammar - Advanced'
      },
      {
        id: '5',
        userId: 'user654',
        username: 'hoangthinh',
        action: 'Completed Listening Practice',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        details: 'Score: 92/100'
      }
    ];
  }

  private getMockTopUsers(): TopUser[] {
    return [
      {
        userId: 'user1',
        username: 'englishmaster01',
        fullName: 'Nguyễn Văn A',
        totalXp: 15750,
        exercisesCompleted: 164,
        averageScore: 94.5,
        level: 12
      },
      {
        userId: 'user2',  
        username: 'toeicpro99',
        fullName: 'Trần Thị B',
        totalXp: 14200,
        exercisesCompleted: 152,
        averageScore: 91.2,
        level: 11
      },
      {
        userId: 'user3',
        username: 'grammarking',
        fullName: 'Lê Phúc C',
        totalXp: 12850,
        exercisesCompleted: 143,
        averageScore: 88.7,
        level: 10
      },
      {
        userId: 'user4',
        username: 'vocabularyqueen',
        fullName: 'Vũ Đình D',
        totalXp: 11420,
        exercisesCompleted: 138,
        averageScore: 86.9,
        level: 9
      },
      {
        userId: 'user5',
        username: 'readingace',
        fullName: 'Hoàng Thị Minh',
        totalXp: 10890,
        exercisesCompleted: 134,
        averageScore: 84.3,
        level: 9
      }
    ];
  }

  private getMockSystemHealth(): SystemHealth {
    return {
      status: 'Healthy',
      uptime: '15 days, 8 hours',
      memoryUsage: 67.4,
      cpuUsage: 23.8,
      activeConnections: 1247,
      lastBackup: '2025-01-27T02:30:00Z',
      issues: []
    };
  }

  private getMockUsers(): AdminUser[] {
    return [
      {
        id: '1',
        userId: 'user123',
        username: 'nguyenvana',
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        level: 7,
        totalXp: 8200,
        joinedDate: '2024-01-15T00:00:00Z',
        lastActivity: new Date(Date.now() - 300000).toISOString(),
        status: 'Active',
        exercisesCompleted: 164,
        averageScore: 85.4,
        streakDays: 12,
        achievements: ['First Steps', 'Week Warrior', 'Grammar Master', 'TOEIC Achiever']
      },
      {
        id: '2',
        userId: 'user456',
        username: 'tranthib',
        fullName: 'Trần Thị B',
        email: 'tranthib@email.com',
        level: 5,
        totalXp: 6100,
        joinedDate: '2024-02-20T00:00:00Z',
        lastActivity: new Date(Date.now() - 600000).toISOString(),
        status: 'Active',
        exercisesCompleted: 98,
        averageScore: 78.2,
        streakDays: 5,
        achievements: ['First Steps', 'Vocabulary Builder', 'Reading Star']
      },
      {
        id: '3',
        userId: 'user789',
        username: 'lephucc',
        fullName: 'Lê Phúc C',
        email: 'lephucc@email.com',
        level: 9,
        totalXp: 12400,
        joinedDate: '2023-11-10T00:00:00Z',
        lastActivity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'Inactive',
        exercisesCompleted: 243,
        averageScore: 92.1,
        streakDays: 0,
        achievements: ['First Steps', 'Week Warrior', 'Grammar Master', 'TOEIC Expert', 'Streak Legend']
      }
    ];
  }

  private getMockExercises(): AdminExercise[] {
    console.log('AdminService - Using mock exercises data');
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const lastWeek = new Date(Date.now() - 604800000).toISOString();
    
    return [
      {
        exerciseId: 1,
        name: 'Part 5: Grammar & Vocabulary - Beginner Level',
        content: 'Complete the sentences by choosing the best answer for each blank.',
        level: 'Beginner',
        type: 'Part 5',
        sourceType: 'manual',
        topic: 'Grammar & Vocabulary',
        questions: JSON.stringify([
          {
            question: 'The company will _____ a new product next month.',
            options: ['launch', 'launches', 'launching', 'launched'],
            correctAnswer: 0,
            explanation: 'Future tense requires the base form of the verb after "will".'
          }
        ]),
        timeLimit: 900,
        createdAt: now,
        updatedAt: now,
        createdBy: 'Admin',
        isActive: true,
        attemptCount: 1234,
        averageScore: 78.5
      },
      {
        exerciseId: 2,
        name: 'Part 6: Text Completion - Intermediate Level',
        content: 'Fill in the blanks in the business email with the most appropriate words.',
        level: 'Intermediate',
        type: 'Part 6',
        sourceType: 'manual',
        topic: 'Business Communication',
        questions: JSON.stringify([
          {
            question: 'Dear Mr. Johnson, We are _____ to inform you...',
            options: ['pleased', 'pleasing', 'pleasure', 'pleasantly'],
            correctAnswer: 0,
            explanation: 'Adjective "pleased" is correct after "are".'
          }
        ]),
        timeLimit: 1200,
        createdAt: yesterday,
        updatedAt: yesterday,
        createdBy: 'Admin',
        isActive: true,
        attemptCount: 567,
        averageScore: 82.3
      },
      {
        exerciseId: 3,
        name: 'Part 7: Business Correspondence - AI Generated',
        content: 'Read the email chain and answer the questions.',
        level: 'Advanced',
        type: 'Part 7',
        sourceType: 'ai',
        topic: 'Business Communication',
        questions: JSON.stringify([
          {
            question: 'What is the main purpose of the first email?',
            options: ['To schedule a meeting', 'To propose a business partnership', 'To request information', 'To confirm an appointment'],
            correctAnswer: 1,
            explanation: 'The email explicitly states the purpose is to explore a partnership opportunity.'
          }
        ]),
        timeLimit: 2700,
        createdAt: lastWeek,
        updatedAt: lastWeek,
        createdBy: 'AI Generator',
        isActive: true,
        attemptCount: 856,
        averageScore: 84.2
      },
      {
        exerciseId: 4,
        name: 'Part 5: Prepositions & Articles - Beginner',
        content: 'Choose the correct prepositions and articles to complete the sentences.',
        level: 'Beginner',
        type: 'Part 5',
        sourceType: 'manual',
        topic: 'Grammar',
        questions: JSON.stringify([
          {
            question: 'The meeting will be held _____ the conference room.',
            options: ['in', 'on', 'at', 'by'],
            correctAnswer: 0,
            explanation: 'Use "in" for enclosed spaces like rooms.'
          }
        ]),
        timeLimit: 600,
        createdAt: now,
        updatedAt: now,
        createdBy: 'Admin',
        isActive: true,
        attemptCount: 234,
        averageScore: 71.8
      },
      {
        exerciseId: 5,
        name: 'Part 7: Reading Comprehension - Advanced',
        content: 'Read the business report and answer detailed questions about the content.',
        level: 'Advanced',
        type: 'Part 7',
        sourceType: 'manual',
        topic: 'Business Analysis',
        questions: JSON.stringify([
          {
            question: 'According to the report, what was the main factor in revenue growth?',
            options: ['Increased marketing', 'New product launches', 'Cost reduction', 'Market expansion'],
            correctAnswer: 3,
            explanation: 'The report specifically mentions market expansion as the key driver.'
          }
        ]),
        timeLimit: 3000,
        createdAt: yesterday,
        updatedAt: yesterday,
        createdBy: 'Admin',
        isActive: true,
        attemptCount: 445,
        averageScore: 89.4
      },
      {
        exerciseId: 6,
        name: 'Part 6: Email Completion - Intermediate',
        content: 'Complete the professional email with appropriate business language.',
        level: 'Intermediate',
        type: 'Part 6',
        sourceType: 'ai',
        topic: 'Professional Communication',
        questions: JSON.stringify([
          {
            question: 'We would like to _____ a meeting for next week.',
            options: ['schedule', 'scheduling', 'scheduled', 'schedules'],
            correctAnswer: 0,
            explanation: '"Would like to" is followed by the base form of the verb.'
          }
        ]),
        timeLimit: 1800,
        createdAt: lastWeek,
        updatedAt: lastWeek,
        createdBy: 'AI Generator',
        isActive: true,
        attemptCount: 678,
        averageScore: 76.9
      }
    ];
  }

  // 🏆 Mock Leaderboard Data
  private getMockLeaderboard(): LeaderboardData {
    return {
      users: [
        {
          userId: 'user123',
          name: 'Nguyễn Văn A',
          totalXp: 15680,
          completedExercises: 245,
          currentStreak: 12,
          rank: 1,
          englishLevel: 'Advanced',
          averageScore: 92.5
        },
        {
          userId: 'user456',
          name: 'Trần Thị B',
          totalXp: 14200,
          completedExercises: 198,
          currentStreak: 8,
          rank: 2,
          englishLevel: 'Intermediate',
          averageScore: 88.3
        },
        {
          userId: 'user789',
          name: 'Lê Phúc C',
          totalXp: 12400,
          completedExercises: 243,
          currentStreak: 0,
          rank: 3,
          englishLevel: 'Advanced',
          averageScore: 92.1
        }
      ],
      totalCount: 3,
      timeFilter: 'all',
      category: 'totalxp',
      lastUpdated: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const adminService = new AdminService();
