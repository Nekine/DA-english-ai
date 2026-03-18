import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, AlertCircle, DollarSign, CreditCard } from 'lucide-react';
import statisticsService, { SystemStatistics } from '@/services/statisticsService';
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserGrowthChart from '@/components/charts/UserGrowthChart';
import RevenuePaymentChart from '@/components/charts/RevenuePaymentChart';

const AdminDashboard = () => {
  // State for statistics from API
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch statistics from API
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await statisticsService.getSystemStatistics();
        setStatistics(data);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  // Format number with comma separator
  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  // Format currency to millions VND
  const formatCurrency = (amount: number): string => {
    const millions = amount / 1000000;
    return `${millions.toFixed(1)}M VNĐ`;
  };

  // Statistics data from API
  const stats = statistics ? [
    { 
      label: "Tổng học viên", 
      value: formatNumber(statistics.TotalUsers), 
      note: "Học viên trong hệ thống",
      icon: Users,
      gradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-900",
      borderColor: "border-blue-100"
    },
    { 
      label: "Mới tháng này", 
      value: formatNumber(statistics.NewUsersThisMonth), 
      note: "Người dùng mới",
      icon: Users,
      gradient: "from-pink-50 to-rose-50",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
      textColor: "text-pink-900",
      borderColor: "border-pink-100"
    },
    { 
      label: "Tổng doanh thu", 
      value: formatCurrency(statistics.TotalRevenue), 
      note: "Tổng doanh thu toàn hệ thống",
      icon: DollarSign,
      gradient: "from-purple-50 to-indigo-50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-900",
      borderColor: "border-purple-100"
    },
    { 
      label: "Doanh thu tháng này", 
      value: formatCurrency(statistics.RevenueThisMonth), 
      note: "So với tháng trước: 5.6M VNĐ",
      icon: DollarSign,
      gradient: "from-green-50 to-emerald-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      textColor: "text-green-900",
      borderColor: "border-green-100"
    },
    { 
      label: "Thanh toán chờ xử lý", 
      value: formatNumber(statistics.PendingPayments), 
      note: "Thanh toán đang chờ xác nhận",
      icon: CreditCard,
      gradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      textColor: "text-amber-900",
      borderColor: "border-amber-100"
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Cards - with real data from API */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
              </CardContent>
            </Card>
          ))
        ) : stats.length > 0 ? (
          stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div 
                key={s.label} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`rounded-xl bg-gradient-to-br ${s.gradient} border ${s.borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2 rounded-lg ${s.iconBg}`}>
                        <Icon className={`h-4 w-4 ${s.iconColor}`} />
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs ${s.textColor} mb-1 font-medium opacity-70`}>{s.label}</p>
                      <h3 className={`text-xl font-bold ${s.textColor} mb-0.5`}>{s.value}</h3>
                      <p className={`text-[10px] ${s.textColor} opacity-60 leading-tight`}>{s.note}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-5 text-center text-gray-500 dark:text-gray-400">
            Không có dữ liệu thống kê
          </div>
        )}
      </div>

      {/* User Growth Chart */}
      <UserGrowthChart />

      {/* Revenue & Payment Chart */}
      <RevenuePaymentChart />
    </div>
  );
};

export default AdminDashboard;