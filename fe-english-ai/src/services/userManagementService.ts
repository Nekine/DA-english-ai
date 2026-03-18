// 👤 USER MANAGEMENT SERVICE - Dedicated service for UserManagementController
// ✅ BACKEND READY: Direct integration with .NET UserManagementController
// 🎯 Features: User CRUD, Leaderboard, Excel Import/Export, Analytics
// 🔄 SEPARATED CONCERNS: Focused on user management only

import type { AdminUser, CreateUserRequest, ImportResult, LeaderboardData, UpdateUserRequest } from './adminService';
import { apiService } from './api';

// 📊 User Analytics Interfaces
export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  averageXpPerUser: number;
  levelDistribution: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  topPerformers: UserPerformance[];
}

export interface UserPerformance {
  userId: string;
  name: string;
  totalXp: number;
  exercisesCompleted: number;
  averageScore: number;
  streakDays: number;
  lastActivity: string;
}

// 🏆 Leaderboard Filters
export type TimeFilter = 'all' | 'today' | 'week' | 'month';
export type CategoryFilter = 'totalxp' | 'exercises' | 'streak';

class UserManagementService {
  
  // 👥 USER CRUD OPERATIONS
  
  /**
   * Get all users with pagination and filters
   * Endpoint: GET /api/user-management/users
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 50,
    searchTerm?: string,
    levelFilter?: string,
    statusFilter?: string
  ): Promise<{ users: AdminUser[]; totalCount: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (levelFilter) params.append('level', levelFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await apiService.get<{ users: AdminUser[]; totalCount: number }>(
        `/api/user-management/users?${params}`
      );
      return response;
    } catch (error) {
      console.warn('UserManagement API not available, using mock data:', error);
      return this.getMockUsersPage(page, pageSize);
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
      return this.getMockUserById(userId);
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

  // 🏆 LEADERBOARD OPERATIONS
  
  /**
   * Get leaderboard data with filters
   * Endpoint: GET /api/user-management/leaderboard
   */
  async getLeaderboard(
    timeFilter: TimeFilter = 'all',
    category: CategoryFilter = 'totalxp',
    limit: number = 50
  ): Promise<LeaderboardData> {
    try {
      const params = new URLSearchParams({
        timeFilter,
        category,
        limit: limit.toString()
      });
      const response = await apiService.get<LeaderboardData>(`/api/user-management/leaderboard?${params}`);
      return response;
    } catch (error) {
      console.warn('Leaderboard API not available, using mock data:', error);
      return this.getMockLeaderboard(timeFilter, category, limit);
    }
  }

  // 📊 USER ANALYTICS
  
  /**
   * Get user analytics and statistics
   * Endpoint: GET /api/user-management/analytics
   */
  async getUserAnalytics(): Promise<UserAnalytics> {
    try {
      const response = await apiService.get<UserAnalytics>('/api/user-management/analytics');
      return response;
    } catch (error) {
      console.warn('User analytics API not available, using mock data:', error);
      return this.getMockUserAnalytics();
    }
  }

  /**
   * Get user progress tracking
   * Endpoint: GET /api/user-management/progress/{userId}
   */
  async getUserProgress(userId: string): Promise<UserPerformance> {
    try {
      const response = await apiService.get<UserPerformance>(`/api/user-management/progress/${userId}`);
      return response;
    } catch (error) {
      console.warn(`User progress for ${userId} not available, using mock data:`, error);
      return this.getMockUserProgress(userId);
    }
  }

  // 📄 EXCEL IMPORT/EXPORT
  
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
  async exportUsersToExcel(filters?: {
    level?: string;
    status?: string;
    dateRange?: { from: string; to: string };
  }): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (filters?.level) params.append('level', filters.level);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.dateRange) {
        params.append('dateFrom', filters.dateRange.from);
        params.append('dateTo', filters.dateRange.to);
      }
      
      const url = `/api/user-management/export-excel${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Users_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export users to Excel:', error);
      throw error;
    }
  }

  // 🎭 MOCK DATA METHODS
  
  private getMockUsersPage(page: number, pageSize: number): { users: AdminUser[]; totalCount: number } {
    const allUsers = this.getAllMockUsers();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      users: allUsers.slice(startIndex, endIndex),
      totalCount: allUsers.length
    };
  }

  private getMockUserById(userId: string): AdminUser | null {
    const users = this.getAllMockUsers();
    return users.find(user => user.userId === userId) || null;
  }

  private getAllMockUsers(): AdminUser[] {
    return [
      {
        id: '1',
        userId: 'user123',
        username: 'nguyenvana',
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        level: 12,
        totalXp: 15680,
        joinedDate: '2023-09-15T00:00:00Z',
        lastActivity: new Date().toISOString(),
        status: 'Active',
        exercisesCompleted: 245,
        averageScore: 92.5,
        streakDays: 12,
        achievements: ['First Steps', 'Week Warrior', 'Grammar Master', 'TOEIC Expert']
      },
      {
        id: '2',
        userId: 'user456',
        username: 'tranthib',
        fullName: 'Trần Thị B',
        email: 'tranthib@email.com',
        level: 8,
        totalXp: 14200,
        joinedDate: '2023-10-20T00:00:00Z',
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
        status: 'Active',
        exercisesCompleted: 198,
        averageScore: 88.3,
        streakDays: 8,
        achievements: ['First Steps', 'Vocabulary Builder', 'Reading Star']
      },
      {
        id: '3',
        userId: 'user789',
        username: 'lephucc',
        fullName: 'Lê Phúc C',
        email: 'lephucc@email.com',
        level: 15,
        totalXp: 18900,
        joinedDate: '2023-08-05T00:00:00Z',
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        status: 'Inactive',
        exercisesCompleted: 312,
        averageScore: 94.7,
        streakDays: 0,
        achievements: ['First Steps', 'Week Warrior', 'Grammar Master', 'TOEIC Expert', 'Streak Legend', 'Perfect Score']
      }
    ];
  }

  private getMockLeaderboard(timeFilter: TimeFilter, category: CategoryFilter, limit: number): LeaderboardData {
    const users = this.getAllMockUsers()
      .map((user, index) => ({
        userId: user.userId,
        name: user.fullName,
        totalXp: user.totalXp,
        completedExercises: user.exercisesCompleted,
        currentStreak: user.streakDays,
        rank: index + 1,
        englishLevel: user.level >= 10 ? 'Advanced' : user.level >= 5 ? 'Intermediate' : 'Beginner',
        averageScore: user.averageScore
      }))
      .slice(0, limit);

    return {
      users,
      totalCount: users.length,
      timeFilter,
      category,
      lastUpdated: new Date().toISOString()
    };
  }

  private getMockUserAnalytics(): UserAnalytics {
    return {
      totalUsers: 1247,
      activeUsers: 892,
      newUsersThisMonth: 156,
      averageXpPerUser: 8420,
      levelDistribution: {
        beginner: 523,
        intermediate: 456,
        advanced: 268
      },
      topPerformers: this.getAllMockUsers().map(user => ({
        userId: user.userId,
        name: user.fullName,
        totalXp: user.totalXp,
        exercisesCompleted: user.exercisesCompleted,
        averageScore: user.averageScore,
        streakDays: user.streakDays,
        lastActivity: user.lastActivity
      }))
    };
  }

  private getMockUserProgress(userId: string): UserPerformance {
    const user = this.getMockUserById(userId);
    if (!user) {
      return {
        userId,
        name: 'Unknown User',
        totalXp: 0,
        exercisesCompleted: 0,
        averageScore: 0,
        streakDays: 0,
        lastActivity: new Date().toISOString()
      };
    }

    return {
      userId: user.userId,
      name: user.fullName,
      totalXp: user.totalXp,
      exercisesCompleted: user.exercisesCompleted,
      averageScore: user.averageScore,
      streakDays: user.streakDays,
      lastActivity: user.lastActivity
    };
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService();