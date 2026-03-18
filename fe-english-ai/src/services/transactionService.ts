import apiService from './api';

// Transaction model
export interface Transaction {
  Id: string;
  UserId: string;
  UserName: string;
  UserEmail: string;
  Amount: number;
  Status: PaymentStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

// Payment status enum
export enum PaymentStatus {
  Completed = 'completed',
  Pending = 'pending',
  Failed = 'failed'
}

// Detailed transaction model
export interface TransactionDetail extends Transaction {
  PaymentMethod?: string;
  TransactionNotes?: string;
  PackageId?: string;
  IsLifetime: boolean;
}

// Filter configuration
export interface TransactionFilters {
  searchTerm?: string;
  status?: PaymentStatus | 'all';
  startDate?: Date | null;
  endDate?: Date | null;
}

// Sort configuration
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// Pagination state
export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Transaction summary for filtered data
export interface TransactionSummary {
  TotalRevenue: number;
  TransactionCount: number;
  AverageTransaction: number;
  CompletedCount: number;
  PendingCount: number;
  FailedCount: number;
}

// Transaction list response
export interface TransactionListResponse {
  Transactions: Transaction[];
  TotalCount: number;
  Page: number;
  PageSize: number;
  TotalPages: number;
  Summary: TransactionSummary;
}

class TransactionService {
  private cache: Map<string, { data: TransactionListResponse; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Build query string from filters and pagination
   */
  private buildQueryString(
    page: number,
    pageSize: number,
    filters?: TransactionFilters,
    sortConfig?: SortConfig
  ): string {
    const params = new URLSearchParams();
    
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    if (filters?.searchTerm) {
      params.append('searchTerm', filters.searchTerm);
    }

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }

    if (filters?.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }

    if (sortConfig) {
      params.append('sortBy', sortConfig.column);
      params.append('sortOrder', sortConfig.direction);
    }

    return params.toString();
  }

  /**
   * Generate cache key from parameters
   */
  private getCacheKey(
    page: number,
    pageSize: number,
    filters?: TransactionFilters,
    sortConfig?: SortConfig
  ): string {
    return this.buildQueryString(page, pageSize, filters, sortConfig);
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(cacheKey: string): TransactionListResponse | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store data in cache
   */
  private setCachedData(cacheKey: string, data: TransactionListResponse): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Fetch paginated list of transactions with filters
   */
  async fetchTransactions(
    page: number = 1,
    pageSize: number = 20,
    filters?: TransactionFilters,
    sortConfig?: SortConfig,
    useCache: boolean = true
  ): Promise<TransactionListResponse> {
    try {
      const cacheKey = this.getCacheKey(page, pageSize, filters, sortConfig);

      // Check cache first if enabled
      if (useCache) {
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
          console.log('Returning cached transaction data');
          return cachedData;
        }
      }

      const queryString = this.buildQueryString(page, pageSize, filters, sortConfig);
      const response = await apiService.get<TransactionListResponse>(
        `/api/Transaction/list?${queryString}`
      );

      // Cache the response
      this.setCachedData(cacheKey, response);

      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Fetch single transaction by ID
   */
  async fetchTransactionById(id: string): Promise<TransactionDetail> {
    try {
      const response = await apiService.get<TransactionDetail>(
        `/api/Transaction/${id}`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retry a failed request with exponential backoff
   */
  async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

// Export singleton instance
const transactionService = new TransactionService();
export default transactionService;
