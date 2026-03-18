import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import TransactionFilters from './TransactionFilters';
import TransactionTable from './TransactionTable';
import TransactionPagination from './TransactionPagination';
import TransactionDetailModal from './TransactionDetailModal';
import ExportButton from './ExportButton';
import paymentService, { Payment } from '@/services/paymentService';
import transactionService, {
  Transaction,
  TransactionFilters as ITransactionFilters,
  SortConfig,
  PaginationState,
  TransactionSummary,
  PaymentStatus,
} from '@/services/transactionService';

const TransactionListSection: React.FC = () => {
  const { toast } = useToast();

  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<ITransactionFilters>({
    searchTerm: '',
    status: 'all',
    startDate: null,
    endDate: null,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'created_at',
    direction: 'desc',
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const [summary, setSummary] = useState<TransactionSummary>({
    TotalRevenue: 0,
    TransactionCount: 0,
    AverageTransaction: 0,
    CompletedCount: 0,
    PendingCount: 0,
    FailedCount: 0,
  });

  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch transactions
  const fetchTransactions = async (useCache: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from new payment API first
      const statusFilter = filters.status !== 'all' ? filters.status as 'pending' | 'completed' | 'failed' : undefined;
      const paymentResponse = await paymentService.getAllPayments(
        pagination.page,
        pagination.pageSize,
        statusFilter
      );

      // Convert Payment[] to Transaction[] format
      const convertedTransactions: Transaction[] = paymentResponse.payments.map((payment: Payment) => ({
        Id: payment.id.toString(),
        UserId: payment.userId.toString(),
        UserName: payment.fullName || 'N/A',
        UserEmail: payment.email,
        Amount: payment.amount,
        Status: payment.status as PaymentStatus,
        CreatedAt: payment.createdAt,
        UpdatedAt: payment.createdAt, // Use CreatedAt as UpdatedAt if not available
      }));

      setTransactions(convertedTransactions);
      setPagination({
        page: paymentResponse.pagination.currentPage,
        pageSize: paymentResponse.pagination.pageSize,
        totalCount: paymentResponse.pagination.totalCount,
        totalPages: paymentResponse.pagination.totalPages,
      });

      // Calculate summary from payments
      const completedPayments = convertedTransactions.filter(t => t.Status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, t) => sum + t.Amount, 0);
      setSummary({
        TotalRevenue: totalRevenue,
        TransactionCount: convertedTransactions.length,
        AverageTransaction: convertedTransactions.length > 0 ? totalRevenue / convertedTransactions.length : 0,
        CompletedCount: completedPayments.length,
        PendingCount: convertedTransactions.filter(t => t.Status === 'pending').length,
        FailedCount: convertedTransactions.filter(t => t.Status === 'failed').length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách giao dịch';
      setError(errorMessage);
      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, filters, sortConfig]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ITransactionFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'all',
      startDate: null,
      endDate: null,
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sorting
  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  };

  // Handle row click
  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransactionId(transaction.Id);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedTransactionId(null);
  };

  // Handle refresh
  const handleRefresh = () => {
    transactionService.clearCache();
    fetchTransactions(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Danh sách giao dịch</h2>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các giao dịch thanh toán
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            transactions={transactions}
            filters={filters}
            sortConfig={sortConfig}
            disabled={loading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions(false)}
            className="mt-2"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Transaction Table */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
        onRowClick={handleRowClick}
      />

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <TransactionPagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Detail Modal */}
      <TransactionDetailModal
        transactionId={selectedTransactionId}
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default TransactionListSection;
