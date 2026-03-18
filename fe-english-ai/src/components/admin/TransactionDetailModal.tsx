import React, { useEffect, useState } from 'react';
import { X, User, Mail, CreditCard, Calendar, Package, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionDetail, PaymentStatus } from '@/services/transactionService';
import transactionService from '@/services/transactionService';
import { useToast } from '@/hooks/use-toast';

interface TransactionDetailModalProps {
  transactionId: string | null;
  open: boolean;
  onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transactionId,
  open,
  onClose,
}) => {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && transactionId) {
      fetchTransactionDetail();
    }
  }, [open, transactionId]);

  const fetchTransactionDetail = async () => {
    if (!transactionId) return;

    setLoading(true);
    try {
      const data = await transactionService.fetchTransactionById(transactionId);
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin giao dịch',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  const InfoRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết giao dịch</span>
            {transaction && (
              <span className="text-sm font-normal text-muted-foreground">
                #{transaction.Id}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : transaction ? (
          <div className="space-y-6">
            {/* Status and Amount */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Trạng thái</p>
                {getStatusBadge(transaction.Status)}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Số tiền</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(transaction.Amount)}
                </p>
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-1">
              <h3 className="font-semibold mb-3">Thông tin người dùng</h3>
              <InfoRow
                icon={<User className="w-5 h-5" />}
                label="Tên người dùng"
                value={transaction.UserName || 'N/A'}
              />
              <InfoRow
                icon={<Mail className="w-5 h-5" />}
                label="Email"
                value={transaction.UserEmail}
              />
            </div>

            {/* Payment Information */}
            <div className="space-y-1">
              <h3 className="font-semibold mb-3">Thông tin thanh toán</h3>
              <InfoRow
                icon={<CreditCard className="w-5 h-5" />}
                label="Phương thức thanh toán"
                value={transaction.PaymentMethod || 'N/A'}
              />
              <InfoRow
                icon={<Package className="w-5 h-5" />}
                label="Gói dịch vụ"
                value={
                  <div className="flex items-center gap-2">
                    <span>Gói #{transaction.PackageId}</span>
                    {transaction.IsLifetime && (
                      <Badge variant="secondary" className="text-xs">
                        Vĩnh viễn
                      </Badge>
                    )}
                  </div>
                }
              />
              <InfoRow
                icon={<Calendar className="w-5 h-5" />}
                label="Ngày tạo"
                value={formatDate(transaction.CreatedAt)}
              />
              <InfoRow
                icon={<Calendar className="w-5 h-5" />}
                label="Cập nhật lần cuối"
                value={formatDate(transaction.UpdatedAt)}
              />
            </div>

            {/* Transaction Notes */}
            {transaction.TransactionNotes && (
              <div className="space-y-1">
                <h3 className="font-semibold mb-3">Ghi chú</h3>
                <InfoRow
                  icon={<FileText className="w-5 h-5" />}
                  label="Lịch sử giao dịch"
                  value={
                    <p className="text-sm whitespace-pre-wrap">
                      {transaction.TransactionNotes}
                    </p>
                  }
                />
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailModal;
