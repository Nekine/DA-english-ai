import apiService from './api';

export interface ManualPaymentRequest {
  email: string;
  amount: number;
  method?: string;
  isLifetime: boolean;
  durationMonths?: number;
  note?: string;
}

export interface Payment {
  id: number;
  userId: number;
  email: string;
  fullName: string | null;
  amount: number;
  method: string | null;
  status: 'pending' | 'completed' | 'failed';
  isLifetime: boolean;
  accountType: string;
  createdAt: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

const paymentService = {
  /**
   * Check if email exists in system
   */
  checkEmail: async (email: string): Promise<{
    exists: boolean;
    userId?: number;
    email?: string;
    fullName?: string;
    accountType?: string;
    status?: string;
  }> => {
    const response = await apiService.get(`/api/payment/check-email?email=${encodeURIComponent(email)}`);
    return response as {
      exists: boolean;
      userId?: number;
      email?: string;
      fullName?: string;
      accountType?: string;
      status?: string;
    };
  },

  /**
   * Add manual payment and upgrade user to premium
   */
  addManualPayment: async (data: ManualPaymentRequest) => {
    const response = await apiService.post('/api/payment/manual-payment', data);
    return response;
  },

  /**
   * Get all payments with pagination and filtering
   */
  getAllPayments: async (
    page: number = 1,
    pageSize: number = 20,
    status?: 'pending' | 'completed' | 'failed'
  ): Promise<PaymentListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    const response = await apiService.get(`/api/payment/all?${params.toString()}`) as PaymentListResponse;
    return response;
  },

  /**
   * Manually trigger expired premium account check
   */
  checkExpiredPremium: async (): Promise<ExpiredCheckResult> => {
    const response = await apiService.post('/api/payment/check-expired-premium', {});
    return response as ExpiredCheckResult;
  },

  /**
   * Get users whose premium expires soon
   */
  getExpiringSoonUsers: async (days: number = 7): Promise<ExpiringSoonResponse> => {
    const response = await apiService.get(`/api/payment/expiring-soon?days=${days}`);
    return response as ExpiringSoonResponse;
  },
};

export interface ExpiredCheckResult {
  success: boolean;
  message: string;
  checkedAt: string;
  totalChecked: number;
  totalDowngraded: number;
  expiredUsers: Array<{
    userId: number;
    email: string;
    fullName: string;
    expiredAt: string;
  }>;
}

export interface ExpiringSoonUser {
  userId: number;
  email: string;
  fullName: string;
  premiumExpiresAt: string;
  daysRemaining: number;
}

export interface ExpiringSoonResponse {
  success: boolean;
  totalExpiringSoon: number;
  withinDays: number;
  users: ExpiringSoonUser[];
}

export default paymentService;
