import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { 
  DollarSign,
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Calendar,
  PieChart as PieChartIcon,
} from 'lucide-react';
import statisticsService, { RevenuePaymentData } from '@/services/statisticsService';

interface RevenueStatisticsChartsProps {
  loading?: boolean;
}

// Define color palette
const COLORS = {
  primary: '#3B82F6',    // Blue
  success: '#10B981',    // Green
  warning: '#F59E0B',    // Amber
  danger: '#EF4444',     // Red
  purple: '#8B5CF6',     // Purple
  pink: '#EC4899',       // Pink
  indigo: '#6366F1',     // Indigo
  teal: '#14B8A6',       // Teal
  emerald: '#059669',    // Emerald
};

const PAYMENT_STATUS_COLORS = {
  completed: COLORS.success,
  pending: COLORS.warning,
  failed: COLORS.danger,
};

export const RevenueStatisticsCharts: React.FC<RevenueStatisticsChartsProps> = ({ loading: parentLoading }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePaymentData[]>([]);
  const [chartData, setChartData] = useState({
    monthlyRevenue: [] as { month: string; revenue: number; payments: number }[],
    revenueByStage: [] as { name: string; value: number; color: string }[],
    revenueTrend: [] as { month: string; revenue: number; growth: number }[],
    paymentDistribution: [] as { name: string; value: number; amount: number; color: string }[],
  });

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await statisticsService.getRevenuePayment();

        if (!data || data.length === 0) {
          // Generate empty data for 12 months
          const emptyData: RevenuePaymentData[] = Array.from({ length: 12 }, (_, i) => ({
            Month: `T${i + 1}`,
            Revenue: 0,
            TotalPayments: 0,
            PendingAmount: 0,
            FailedAmount: 0,
          }));
          setRevenueData(emptyData);
        } else {
          setRevenueData(data);
        }

        // Process data for charts
        if (data && data.length > 0) {
          // 1. Monthly Revenue
          const monthlyData = data.map(item => ({
            month: item.Month,
            revenue: item.Revenue / 1000000, // Convert to millions
            payments: item.TotalPayments,
          }));

          // 2. Revenue by Stage (Completed, Pending, Failed)
          const totalCompleted = data.reduce((sum, item) => sum + item.Revenue, 0);
          const totalPending = data.reduce((sum, item) => sum + item.PendingAmount, 0);
          const totalFailed = data.reduce((sum, item) => sum + item.FailedAmount, 0);

          const stageData = [
            { 
              name: 'Đã hoàn thành', 
              value: totalCompleted / 1000000, 
              color: PAYMENT_STATUS_COLORS.completed 
            },
            { 
              name: 'Chờ xử lý', 
              value: totalPending / 1000000, 
              color: PAYMENT_STATUS_COLORS.pending 
            },
            { 
              name: 'Thất bại', 
              value: totalFailed / 1000000, 
              color: PAYMENT_STATUS_COLORS.failed 
            },
          ].filter(item => item.value > 0);

          // 3. Revenue Trend (with growth rate)
          const trendData = data.map((item, index) => {
            const prevRevenue = index > 0 ? data[index - 1].Revenue : item.Revenue;
            const growth = prevRevenue > 0 ? ((item.Revenue - prevRevenue) / prevRevenue) * 100 : 0;
            return {
              month: item.Month,
              revenue: item.Revenue / 1000000,
              growth: parseFloat(growth.toFixed(1)),
            };
          });

          // 4. Payment Distribution
          const totalPayments = data.reduce((sum, item) => sum + item.TotalPayments, 0);
          const completedPayments = data.reduce((sum, item) => sum + item.TotalPayments, 0);
          const totalPaymentsAmount = totalCompleted + totalPending + totalFailed;

          const distributionData = [
            {
              name: 'Thanh toán thành công',
              value: completedPayments,
              amount: totalCompleted / 1000000,
              color: PAYMENT_STATUS_COLORS.completed,
            },
            {
              name: 'Thanh toán chờ xử lý',
              value: Math.round(totalPayments * (totalPending / totalPaymentsAmount)) || 0,
              amount: totalPending / 1000000,
              color: PAYMENT_STATUS_COLORS.pending,
            },
            {
              name: 'Thanh toán thất bại',
              value: Math.round(totalPayments * (totalFailed / totalPaymentsAmount)) || 0,
              amount: totalFailed / 1000000,
              color: PAYMENT_STATUS_COLORS.failed,
            },
          ].filter(item => item.value > 0);

          setChartData({
            monthlyRevenue: monthlyData,
            revenueByStage: stageData,
            revenueTrend: trendData,
            paymentDistribution: distributionData,
          });
        }
      } catch (err) {
        console.error('Error fetching revenue chart data:', err);
        setError('Không thể tải dữ liệu biểu đồ doanh thu. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (loading || parentLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-80">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Custom tooltip
  interface TooltipPayload {
    name?: string;
    value: number;
    dataKey?: string;
    payload?: {
      month?: string;
      revenue?: number;
      growth?: number;
      payments?: number;
    };
  }

  const RevenueTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl shadow-2xl border-2 border-green-200 dark:border-green-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            {payload[0].payload?.month}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              {entry.name || entry.dataKey}: <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {entry.dataKey === 'growth' ? `${entry.value}%` : `${entry.value.toFixed(1)}M VNĐ`}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  interface PaymentTooltipPayload {
    name?: string;
    value: number;
    dataKey?: string;
    payload?: {
      name?: string;
      value?: number;
      amount?: number;
      color?: string;
    };
  }

  const PaymentTooltip = ({ active, payload }: { active?: boolean; payload?: PaymentTooltipPayload[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl shadow-2xl border-2 border-blue-200 dark:border-blue-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            {data.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Số lượng: <span className="font-bold text-blue-600">{data.value || 0}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Doanh thu: <span className="font-bold text-green-600">{data.amount ? data.amount.toFixed(1) : '0'}M VNĐ</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomLabel = (entry: { value: number; percent?: number }) => {
    const percent = entry.percent ? (entry.percent * 100).toFixed(0) : '0';
    return `${percent}%`;
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Monthly Revenue & Revenue by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Composed Chart */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50 dark:from-gray-800 dark:via-green-900/10 dark:to-emerald-900/10 border-2 border-green-100 dark:border-green-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Doanh thu theo tháng
                </CardTitle>
                <CardDescription className="text-sm">Doanh thu và số lượng thanh toán</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="opacity-50" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                  label={{ value: 'Doanh thu (M VNĐ)', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                  label={{ value: 'Thanh toán', angle: 90, position: 'insideRight', style: { fontSize: '11px' } }}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="payments" 
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                  name="Số thanh toán"
                  radius={[8, 8, 0, 0]}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={COLORS.success}
                  strokeWidth={3}
                  name="Doanh thu (M VNĐ)"
                  dot={{ fill: COLORS.success, r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Stage Pie Chart */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-800 dark:via-blue-900/10 dark:to-indigo-900/10 border-2 border-blue-100 dark:border-blue-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                <PieChartIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Phân bố theo giai đoạn
                </CardTitle>
                <CardDescription className="text-sm">Doanh thu theo trạng thái thanh toán</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.revenueByStage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.revenueByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}M VNĐ`}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {chartData.revenueByStage.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}: <span className="font-bold text-gray-900 dark:text-white">{item.value.toFixed(1)}M</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Revenue Trend & Payment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend with Growth Rate */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-purple-50/30 to-pink-50/50 dark:from-gray-800 dark:via-purple-900/10 dark:to-pink-900/10 border-2 border-purple-100 dark:border-purple-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Xu hướng tăng trưởng
                </CardTitle>
                <CardDescription className="text-sm">Doanh thu và tỷ lệ tăng trưởng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData.revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS.pink} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="opacity-50" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                  label={{ value: 'Doanh thu (M VNĐ)', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                  label={{ value: 'Tăng trưởng (%)', angle: 90, position: 'insideRight', style: { fontSize: '11px' } }}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={COLORS.purple}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenueTrend)" 
                  name="Doanh thu (M VNĐ)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="growth" 
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  name="Tăng trưởng (%)"
                  dot={{ fill: COLORS.warning, r: 4 }}
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Distribution Bar Chart */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/50 dark:from-gray-800 dark:via-teal-900/10 dark:to-cyan-900/10 border-2 border-teal-100 dark:border-teal-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/30">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Phân bố thanh toán
                </CardTitle>
                <CardDescription className="text-sm">Số lượng theo trạng thái</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.paymentDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '11px' }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<PaymentTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[12, 12, 0, 0]}
                  name="Số lượng"
                >
                  {chartData.paymentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Stats Cards */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {chartData.paymentDistribution.map((item, index) => (
                <div key={index} className="flex flex-col items-center p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {item.name.includes('thành công') && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {item.name.includes('chờ') && <Clock className="h-4 w-4 text-amber-500" />}
                    {item.name.includes('thất bại') && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 text-center">{item.name}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
