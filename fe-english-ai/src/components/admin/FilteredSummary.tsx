import React from 'react';
import { DollarSign, FileText, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionSummary } from '@/services/transactionService';

interface FilteredSummaryProps {
  summary: TransactionSummary;
  showStatusBreakdown?: boolean;
}

const FilteredSummary: React.FC<FilteredSummaryProps> = ({
  summary,
  showStatusBreakdown = true,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
  }> = ({ title, value, icon, description, trend }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(summary.TotalRevenue)}
          icon={<DollarSign className="w-4 h-4" />}
          description="Từ các giao dịch đã hoàn thành"
        />
        <StatCard
          title="Tổng giao dịch"
          value={formatNumber(summary.TransactionCount)}
          icon={<FileText className="w-4 h-4" />}
          description="Tất cả các giao dịch"
        />
        <StatCard
          title="Giá trị trung bình"
          value={formatCurrency(summary.AverageTransaction)}
          icon={<TrendingUp className="w-4 h-4" />}
          description="Trung bình mỗi giao dịch"
        />
      </div>

      {/* Status Breakdown */}
      {showStatusBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(summary.CompletedCount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.TransactionCount > 0
                  ? `${((summary.CompletedCount / summary.TransactionCount) * 100).toFixed(1)}% tổng số`
                  : '0% tổng số'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatNumber(summary.PendingCount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.TransactionCount > 0
                  ? `${((summary.PendingCount / summary.TransactionCount) * 100).toFixed(1)}% tổng số`
                  : '0% tổng số'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thất bại</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(summary.FailedCount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.TransactionCount > 0
                  ? `${((summary.FailedCount / summary.TransactionCount) * 100).toFixed(1)}% tổng số`
                  : '0% tổng số'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FilteredSummary;
