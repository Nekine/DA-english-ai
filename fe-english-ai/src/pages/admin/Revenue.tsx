import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle, 
  CreditCard, 
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Plus,
  RefreshCw,
} from 'lucide-react';
import statisticsService, { SystemStatistics, RevenuePaymentData } from '@/services/statisticsService';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RevenueStatisticsCharts } from '@/components/RevenueStatisticsCharts';
import TransactionListSection from '@/components/admin/TransactionListSection';
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog';

const RevenuePage = () => {
  // State for statistics from API
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch statistics from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both statistics and revenue payment data
        const [stats, revenue] = await Promise.all([
          statisticsService.getSystemStatistics(),
          statisticsService.getRevenuePayment(),
        ]);
        
        setStatistics(stats);
        setRevenueData(revenue || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handlePaymentSuccess = () => {
    handleRefresh();
  };

  // Format currency to millions VND
  const formatCurrency = (amount: number): string => {
    const millions = amount / 1000000;
    return `${millions.toFixed(1)}M`;
  };

  // Format full currency
  const formatFullCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  // Calculate statistics from revenue data
  const calculateStats = () => {
    if (!revenueData || revenueData.length === 0) {
      return {
        totalRevenue: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        totalPending: 0,
        totalFailed: 0,
        totalPayments: 0,
        completedPayments: 0,
        growthRate: 0,
      };
    }

    const totalRevenue = revenueData.reduce((sum, item) => sum + item.Revenue, 0);
    const totalPending = revenueData.reduce((sum, item) => sum + item.PendingAmount, 0);
    const totalFailed = revenueData.reduce((sum, item) => sum + item.FailedAmount, 0);
    const totalPayments = revenueData.reduce((sum, item) => sum + item.TotalPayments, 0);
    
    // Get this month and last month revenue (last 2 items in array)
    const thisMonthRevenue = revenueData.length > 0 ? revenueData[revenueData.length - 1].Revenue : 0;
    const lastMonthRevenue = revenueData.length > 1 ? revenueData[revenueData.length - 2].Revenue : 0;
    
    // Calculate growth rate
    const growthRate = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    // Calculate completed payments (approximate)
    const totalAmount = totalRevenue + totalPending + totalFailed;
    const completedPayments = totalAmount > 0 
      ? Math.round(totalPayments * (totalRevenue / totalAmount))
      : totalPayments;

    return {
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalPending,
      totalFailed,
      totalPayments,
      completedPayments,
      growthRate,
    };
  };

  const stats = calculateStats();

  // Revenue metric cards
  const revenueMetrics = [
    {
      label: "Tổng doanh thu",
      value: formatCurrency(statistics?.TotalRevenue || stats.totalRevenue),
      fullValue: formatFullCurrency(statistics?.TotalRevenue || stats.totalRevenue),
      note: "Tổng doanh thu toàn hệ thống",
      icon: DollarSign,
      gradient: "from-green-50 to-emerald-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      textColor: "text-green-900",
      borderColor: "border-green-200",
      badge: null,
    },
    {
      label: "Doanh thu tháng này",
      value: formatCurrency(statistics?.RevenueThisMonth || stats.thisMonthRevenue),
      fullValue: formatFullCurrency(statistics?.RevenueThisMonth || stats.thisMonthRevenue),
      note: `So với tháng trước: ${stats.lastMonthRevenue > 0 ? formatCurrency(stats.lastMonthRevenue) : '0'} VNĐ`,
      icon: Calendar,
      gradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-900",
      borderColor: "border-blue-200",
      badge: stats.growthRate !== 0 ? (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
          stats.growthRate > 0 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {stats.growthRate > 0 ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(stats.growthRate).toFixed(1)}%
        </div>
      ) : null,
    },
    {
      label: "Doanh thu chờ xử lý",
      value: formatCurrency(stats.totalPending),
      fullValue: formatFullCurrency(stats.totalPending),
      note: "Thanh toán đang chờ xác nhận",
      icon: Clock,
      gradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-900",
      borderColor: "border-amber-200",
      badge: null,
    },
    {
      label: "Doanh thu thất bại",
      value: formatCurrency(stats.totalFailed),
      fullValue: formatFullCurrency(stats.totalFailed),
      note: "Thanh toán không thành công",
      icon: XCircle,
      gradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      textColor: "text-red-900",
      borderColor: "border-red-200",
      badge: null,
    },
  ];

  const paymentMetrics = [
    {
      label: "Tổng thanh toán",
      value: stats.totalPayments.toLocaleString('vi-VN'),
      note: "Tất cả giao dịch",
      icon: CreditCard,
      gradient: "from-purple-50 to-violet-50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-900",
      borderColor: "border-purple-200",
    },
    {
      label: "Thanh toán thành công",
      value: stats.completedPayments.toLocaleString('vi-VN'),
      note: `${stats.totalPayments > 0 ? ((stats.completedPayments / stats.totalPayments) * 100).toFixed(1) : 0}% tổng số`,
      icon: CheckCircle,
      gradient: "from-teal-50 to-cyan-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      textColor: "text-teal-900",
      borderColor: "border-teal-200",
    },
    {
      label: "Thanh toán chờ",
      value: (statistics?.PendingPayments || 0).toLocaleString('vi-VN'),
      note: "Đang chờ xử lý",
      icon: Activity,
      gradient: "from-indigo-50 to-blue-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      textColor: "text-indigo-900",
      borderColor: "border-indigo-200",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Báo cáo Doanh thu
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quản lý và theo dõi doanh thu, thanh toán với các biểu đồ trực quan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            onClick={() => setAddPaymentOpen(true)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm thanh toán
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Revenue Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Tổng quan Doanh thu
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            revenueMetrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <motion.div 
                  key={metric.label} 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`rounded-lg bg-gradient-to-br ${metric.gradient} border ${metric.borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${metric.iconBg}`}>
                          <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                        </div>
                        {metric.badge && <div>{metric.badge}</div>}
                      </div>
                      <p className={`text-xs ${metric.textColor} mb-0.5 font-medium opacity-80`}>
                        {metric.label}
                      </p>
                      <h3 className={`text-xl font-bold ${metric.textColor} mb-0.5`} title={metric.fullValue}>
                        {metric.value} <span className="text-sm">VNĐ</span>
                      </h3>
                      <p className={`text-[10px] ${metric.textColor} opacity-70 line-clamp-1`}>
                        {metric.note}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Payment Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-purple-600" />
          Thống kê Thanh toán
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            paymentMetrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <motion.div 
                  key={metric.label} 
                  initial={{ opacity: 0, y: 4 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.03 + 0.12 }}
                >
                  <Card className={`rounded-lg bg-gradient-to-br ${metric.gradient} border ${metric.borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${metric.iconBg}`}>
                          <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                        </div>
                      </div>
                      <p className={`text-xs ${metric.textColor} mb-0.5 font-medium opacity-80`}>
                        {metric.label}
                      </p>
                      <h3 className={`text-xl font-bold ${metric.textColor} mb-0.5`}>
                        {metric.value}
                      </h3>
                      <p className={`text-[10px] ${metric.textColor} opacity-70 line-clamp-1`}>
                        {metric.note}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Revenue Statistics Charts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Biểu đồ Phân tích
        </h2>
        <RevenueStatisticsCharts loading={loading} />
      </div>

      {/* Transaction List Section */}
      <div>
        <TransactionListSection key={refreshKey} />
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default RevenuePage;
