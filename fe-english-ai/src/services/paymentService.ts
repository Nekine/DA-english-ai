import apiService from './api';

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

export type PaymentPlanTier = 'pre' | 'max';
export type PaymentPlanCycle = '1month' | '6months' | '1year';

export interface CreatePayosPaymentRequest {
  tier: PaymentPlanTier;
  cycle: PaymentPlanCycle;
  fullName: string;
  email: string;
  phone: string;
}

export interface CreatePayosPaymentResponse {
  success: boolean;
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  amount: number;
}

export interface PayosOrderStatusResponse {
  success: boolean;
  orderCode: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  tier: PaymentPlanTier;
  cycle: PaymentPlanCycle;
  packageName: string;
}

const paymentService = {
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
  checkExpiredPremium: async (packageType: 'all' | 'pre' | 'max' = 'all'): Promise<ExpiredCheckResult> => {
    const response = await apiService.post(`/api/payment/check-expired-premium?packageType=${packageType}`, {});
    return response as ExpiredCheckResult;
  },

  /**
   * Get users whose premium expires soon
   */
  getExpiringSoonUsers: async (days: number = 7, packageType: 'all' | 'pre' | 'max' = 'all'): Promise<ExpiringSoonResponse> => {
    const response = await apiService.get(`/api/payment/expiring-soon?days=${days}&packageType=${packageType}`);
    return response as ExpiringSoonResponse;
  },

  /**
   * Create a PayOS payment link for current authenticated user
   */
  createPayosPaymentLink: async (data: CreatePayosPaymentRequest): Promise<CreatePayosPaymentResponse> => {
    const response = await apiService.post('/api/payment/payos/create-link', data);
    return response as CreatePayosPaymentResponse;
  },

  /**
   * Get payment order status for current authenticated user
   */
  getPayosOrderStatus: async (orderCode: string): Promise<PayosOrderStatusResponse> => {
    const response = await apiService.get(`/api/payment/payos/order/${encodeURIComponent(orderCode)}`);
    return response as PayosOrderStatusResponse;
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
    accountType?: string;
    expiredAt: string;
  }>;
}

export interface ExpiringSoonUser {
  userId: number;
  email: string;
  fullName: string;
  accountType?: string;
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
