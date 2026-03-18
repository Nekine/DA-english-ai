import apiService from './api';

export interface User {
  UserID: number;
  Username: string;
  Email: string;
  Phone?: string;
  AccountType: string; // 'free', 'premium'
  Status: string; // 'active', 'inactive', 'banned'
  FullName?: string;
  AvatarUrl?: string;
  TotalXP?: number;
  PremiumExpiresAt?: string;
}

export interface UserProfile {
  UserID: number;
  Username: string;
  Email: string;
  Phone?: string;
  AccountType: string; // 'free', 'premium'
  Status: string;
  // Profile fields
  FullName?: string;
  AvatarURL?: string;
  Address?: string;
  Bio?: string;
  TotalStudyTime?: number; // in minutes
  TotalXP?: number;
  PremiumExpiresAt?: string; // NULL = lifetime premium
  LastActiveAt?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface UserStatistics {
  TotalUsers: number;
  ActiveUsers: number;
  NewThisMonth: number;
  PremiumUsers: number;
  InactiveUsers: number;
}

export interface PaginationInfo {
  CurrentPage: number;
  PageSize: number;
  TotalCount: number;
  TotalPages: number;
  HasPrevious: boolean;
  HasNext: boolean;
}

export interface PaginatedResponse<T> {
  Data: T[];
  Pagination: PaginationInfo;
}

export interface StatusReason {
  ReasonCode: string;
  ReasonName: string;
  Description: string | null;
  IsTemporary: boolean;
}

export interface StatusHistory {
  HistoryID: number;
  FromStatus: string | null;
  ToStatus: string;
  ReasonCode: string | null;
  ReasonName: string | null;
  ReasonNote: string | null;
  ExpiresAt: string | null;
  ChangedByUserID: number | null;
  ChangedByUsername: string | null;
  ChangedAt: string;
}

export interface UpdateStatusPayload {
  status: string;
  reasonCode?: string;
  reasonNote?: string;
  changedByUserID?: number;
}

class UserService {
  /**
   * Get users with pagination
   */
  async getUsers(page: number = 1, pageSize: number = 10, role?: string, search?: string, status?: string, accountType?: string): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (role) {
        params.append('role', role);
      }
      if (search) {
        params.append('search', search);
      }
      if (status) {
        params.append('status', status);
      }
      if (accountType) {
        params.append('accountType', accountType);
      }

      const response = await apiService.request<PaginatedResponse<User>>(`/api/Users?${params.toString()}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get all users (backward compatibility)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await apiService.request<PaginatedResponse<User>>('/api/Users?pageSize=1000', {
        method: 'GET',
      });
      return response.Data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get users by role (backward compatibility)
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const response = await apiService.request<PaginatedResponse<User>>(`/api/Users?role=${role}&pageSize=1000`, {
        method: 'GET',
      });
      return response.Data;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUserById(id: number): Promise<User> {
    try {
      const response = await apiService.request<User>(`/api/Users/${id}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile with full details
   */
  async getUserProfile(id: number): Promise<UserProfile> {
    try {
      const response = await apiService.request<UserProfile>(`/api/Users/${id}/profile`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error(`Error fetching user profile ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all available status reason codes
   */
  async getStatusReasons(): Promise<StatusReason[]> {
    try {
      const response = await apiService.request<StatusReason[]>('/api/Users/status-reasons', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching status reasons:', error);
      throw error;
    }
  }

  /**
   * Get status change history for a user
   */
  async getUserStatusHistory(userId: number): Promise<StatusHistory[]> {
    try {
      const response = await apiService.request<StatusHistory[]>(
        `/api/Users/${userId}/status-history`,
        {
          method: 'GET',
        }
      );
      return response;
    } catch (error) {
      console.error(`Error fetching status history for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user status with reason
   */
  async updateUserStatus(
    userId: number, 
    newStatus: string,
    reasonCode?: string,
    reasonNote?: string,
    changedByUserID?: number
  ): Promise<{ message: string; userId: number; newStatus: string }> {
    try {
      const payload: UpdateStatusPayload = {
        status: newStatus,
      };

      if (reasonCode) {
        payload.reasonCode = reasonCode;
      }

      if (reasonNote) {
        payload.reasonNote = reasonNote;
      }

      if (changedByUserID) {
        payload.changedByUserID = changedByUserID;
      }

      const response = await apiService.request<{ message: string; userId: number; newStatus: string }>(
        `/api/Users/${userId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      return response;
    } catch (error) {
      console.error(`Error updating user ${userId} status:`, error);
      throw error;
    }
  }

  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const response = await apiService.request<UserStatistics>('/api/Users/statistics');
      return response;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  /**
   * Get user chart data for analytics dashboard
   */
  async getUserCharts(): Promise<UserChartsData> {
    try {
      const response = await apiService.request<UserChartsData>('/api/Users/charts');
      return response;
    } catch (error) {
      console.error('Error fetching user charts:', error);
      throw error;
    }
  }
}

export interface UserChartsData {
  StatusDistribution: { status: string; count: number }[];
  AccountTypeDistribution: { accountType: string; count: number }[];
  MonthlyGrowth: { month: string; count: number }[];
  XpDistribution: { range: string; count: number }[];
}

// Export singleton instance
const userService = new UserService();
export default userService;
