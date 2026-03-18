import apiService from './api';

export interface SystemStatistics {
  TotalUsers: number;
  ActiveUsers: number;
  NewUsersThisMonth: number;
  TotalTests: number;
  TotalExercises: number;
  TotalCompletions: number;
  TotalRevenue: number;
  RevenueThisMonth: number;
  PendingPayments: number;
}

export interface UsersByRole {
  [role: string]: number;
}

export interface UserGrowthData {
  Month: string;
  NewUsers: number;
  ActiveUsers: number;
}

export interface RevenuePaymentData {
  Month: string;
  Revenue: number;
  TotalPayments: number;
  PendingAmount: number;
  FailedAmount: number;
}

class StatisticsService {
  /**
   * Get system-wide statistics
   */
  async getSystemStatistics(): Promise<SystemStatistics> {
    try {
      const response = await apiService.request<SystemStatistics>('/api/Statistics', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching system statistics:', error);
      throw error;
    }
  }

  /**
   * Get users count by role
   */
  async getUsersByRole(): Promise<UsersByRole> {
    try {
      const response = await apiService.request<UsersByRole>('/api/Statistics/users-by-role', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }

  /**
   * Get user growth data for the last 12 months
   */
  async getUserGrowth(): Promise<UserGrowthData[]> {
    try {
      const response = await apiService.request<UserGrowthData[]>('/api/Statistics/user-growth', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      throw error;
    }
  }

  /**
   * Get revenue and payment data for the last 12 months
   */
  async getRevenuePayment(): Promise<RevenuePaymentData[]> {
    try {
      const response = await apiService.request<RevenuePaymentData[]>('/api/Statistics/revenue-payment', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error fetching revenue payment data:', error);
      throw error;
    }
  }
}

// Export singleton instance
const statisticsService = new StatisticsService();
export default statisticsService;
