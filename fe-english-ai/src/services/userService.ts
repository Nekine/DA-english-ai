import apiService from './api';

export interface User {
  UserID: number;
  Username: string;
  Email: string;
  Phone?: string;
  AccountType: string; // 'basic', 'pre', 'max'
  Status: string; // 'active', 'inactive', 'banned'
  FullName?: string;
  AvatarUrl?: string;
  TotalXP?: number;
  TotalStudyTime?: number;
  PremiumExpiresAt?: string;
  CreatedAt?: string;
}

export interface UserProfile {
  UserID: number;
  Username: string;
  Email: string;
  Phone?: string;
  AccountType: string; // 'basic', 'pre', 'max'
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
  PreUsers: number;
  MaxUsers: number;
  BasicUsers: number;
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
  private normalizeAccountType(value?: string): 'basic' | 'pre' | 'max' {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'max') {
      return 'max';
    }

    if (normalized === 'pre' || normalized === 'premium') {
      return 'pre';
    }

    return 'basic';
  }

  private normalizeStatus(value?: string): 'active' | 'inactive' | 'banned' {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'active' || normalized === 'inactive' || normalized === 'banned') {
      return normalized;
    }

    return 'inactive';
  }

  private isSameMonth(dateValue: string, now: Date): boolean {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
  }

  /**
   * Get users with pagination
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 10,
    role?: string,
    search?: string,
    status?: string,
    accountType?: string,
  ): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      void role;
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

      return {
        ...response,
        Data: (response.Data || []).map((user) => ({
          ...user,
          AccountType: this.normalizeAccountType(user.AccountType),
          Status: this.normalizeStatus(user.Status),
        })),
      };
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
      const allUsers: User[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const response = await this.getUsers(currentPage, 100);
        allUsers.push(...response.Data);
        totalPages = Math.max(response.Pagination?.TotalPages || 1, 1);

        if (!response.Data.length) {
          break;
        }

        currentPage += 1;
      }

      return allUsers;
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
      void role;
      return this.getAllUsers();
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
      return {
        ...response,
        AccountType: this.normalizeAccountType(response.AccountType),
        Status: this.normalizeStatus(response.Status),
      };
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
      const response = await apiService.request<UserProfile>(`/api/Users/${id}/profile`, { method: 'GET' });
      return {
        ...response,
        AccountType: this.normalizeAccountType(response.AccountType),
        Status: this.normalizeStatus(response.Status),
      };
    } catch (error) {
      console.warn(`Profile endpoint unavailable for user ${id}, using detail endpoint /api/Users/${id}.`);
      const detail = await apiService.request<UserProfile & { Avatar?: string; AvatarUrl?: string }>(`/api/Users/${id}`, {
        method: 'GET',
      });

      return {
        ...detail,
        AccountType: this.normalizeAccountType(detail.AccountType),
        Status: this.normalizeStatus(detail.Status),
        AvatarURL: detail.AvatarURL || detail.Avatar || detail.AvatarUrl,
        TotalStudyTime: detail.TotalStudyTime || 0,
        TotalXP: detail.TotalXP || 0,
      };
    }
  }

  /**
   * Get all available status reason codes
   */
  async getStatusReasons(): Promise<StatusReason[]> {
    return [
      {
        ReasonCode: 'POLICY',
        ReasonName: 'Vi phạm quy định',
        Description: 'Người dùng vi phạm quy định sử dụng hệ thống.',
        IsTemporary: false,
      },
      {
        ReasonCode: 'REQUEST',
        ReasonName: 'Theo yêu cầu quản trị',
        Description: 'Thay đổi trạng thái theo quyết định của quản trị viên.',
        IsTemporary: true,
      },
      {
        ReasonCode: 'OTHER',
        ReasonName: 'Lý do khác',
        Description: 'Lý do không thuộc các danh mục trên.',
        IsTemporary: false,
      },
    ];
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
      console.warn(`Status history endpoint unavailable for user ${userId}.`);
      return [];
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
      void reasonCode;
      void reasonNote;
      void changedByUserID;

      const payload: UpdateStatusPayload = { status: this.normalizeStatus(newStatus) };

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
      const allUsers = await this.getAllUsers();
      const now = new Date();

      const activeUsers = allUsers.filter((user) => this.normalizeStatus(user.Status) === 'active').length;
      const inactiveUsers = allUsers.filter((user) => this.normalizeStatus(user.Status) === 'inactive').length;
      const newThisMonth = allUsers.filter((user) => user.CreatedAt && this.isSameMonth(user.CreatedAt, now)).length;
      const preUsers = allUsers.filter((user) => this.normalizeAccountType(user.AccountType) === 'pre').length;
      const maxUsers = allUsers.filter((user) => this.normalizeAccountType(user.AccountType) === 'max').length;
      const basicUsers = allUsers.filter((user) => this.normalizeAccountType(user.AccountType) === 'basic').length;

      return {
        TotalUsers: allUsers.length,
        ActiveUsers: activeUsers,
        NewThisMonth: newThisMonth,
        PreUsers: preUsers,
        MaxUsers: maxUsers,
        BasicUsers: basicUsers,
        PremiumUsers: preUsers + maxUsers,
        InactiveUsers: inactiveUsers,
      };
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
      const allUsers = await this.getAllUsers();

      const statusCount = new Map<string, number>([
        ['active', 0],
        ['inactive', 0],
        ['banned', 0],
      ]);

      const accountCount = new Map<string, number>([
        ['basic', 0],
        ['pre', 0],
        ['max', 0],
      ]);

      for (const user of allUsers) {
        const status = this.normalizeStatus(user.Status);
        statusCount.set(status, (statusCount.get(status) || 0) + 1);

        const accountType = this.normalizeAccountType(user.AccountType);
        accountCount.set(accountType, (accountCount.get(accountType) || 0) + 1);
      }

      const monthlyMap = new Map<string, number>();
      const now = new Date();
      const monthlyBuckets: string[] = [];
      for (let i = 11; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyBuckets.push(key);
        monthlyMap.set(key, 0);
      }

      for (const user of allUsers) {
        if (!user.CreatedAt) {
          continue;
        }
        const createdAt = new Date(user.CreatedAt);
        if (Number.isNaN(createdAt.getTime())) {
          continue;
        }
        const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
      }

      const xpDistribution = [
        { range: '0-999', count: 0 },
        { range: '1000-4999', count: 0 },
        { range: '5000-9999', count: 0 },
        { range: '10000+', count: 0 },
      ];

      for (const user of allUsers) {
        const xp = user.TotalXP || 0;
        if (xp < 1000) {
          xpDistribution[0].count += 1;
        } else if (xp < 5000) {
          xpDistribution[1].count += 1;
        } else if (xp < 10000) {
          xpDistribution[2].count += 1;
        } else {
          xpDistribution[3].count += 1;
        }
      }

      return {
        StatusDistribution: [...statusCount.entries()].map(([status, count]) => ({ status, count })),
        AccountTypeDistribution: [...accountCount.entries()].map(([accountType, count]) => ({ accountType, count })),
        MonthlyGrowth: monthlyBuckets.map((month) => ({ month, count: monthlyMap.get(month) || 0 })),
        XpDistribution: xpDistribution,
      };
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
