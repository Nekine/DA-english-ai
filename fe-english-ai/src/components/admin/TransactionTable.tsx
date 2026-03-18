import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Transaction, SortConfig, PaymentStatus } from '@/services/transactionService';
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  onRowClick: (transaction: Transaction) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  sortConfig,
  onSort,
  onRowClick,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      [PaymentStatus.Completed]: {
        label: 'Đã hoàn thành',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      [PaymentStatus.Pending]: {
        label: 'Chờ xử lý',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      },
      [PaymentStatus.Failed]: {
        label: 'Thất bại',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      },
    };

    const config = statusConfig[status as PaymentStatus] || {
      label: status,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const SortableHeader: React.FC<{ column: string; label: string }> = ({
    column,
    label,
  }) => (
    <TableHead>
      <button
        onClick={() => onSort(column)}
        className="flex items-center font-semibold hover:text-primary transition-colors"
      >
        {label}
        {getSortIcon(column)}
      </button>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <p className="text-muted-foreground">Không tìm thấy giao dịch nào</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader column="id" label="ID" />
            <SortableHeader column="user_name" label="Người dùng" />
            <SortableHeader column="user_email" label="Email" />
            <SortableHeader column="amount" label="Số tiền" />
            <SortableHeader column="status" label="Trạng thái" />
            <SortableHeader column="created_at" label="Ngày tạo" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={transaction.Id}
              onClick={() => onRowClick(transaction)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <TableCell className="font-medium">#{transaction.Id}</TableCell>
              <TableCell>{transaction.UserName || 'N/A'}</TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.UserEmail}
              </TableCell>
              <TableCell className="font-semibold">
                {formatCurrency(transaction.Amount)}
              </TableCell>
              <TableCell>{getStatusBadge(transaction.Status)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(transaction.CreatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;
