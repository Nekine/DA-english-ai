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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  Activity,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  Ban,
  Crown
} from 'lucide-react';
import userService, { UserChartsData } from '@/services/userService';

interface UserStatisticsChartsProps {
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
};

const STATUS_COLORS = {
  active: COLORS.success,
  inactive: COLORS.warning,
  banned: COLORS.danger,
};

const ACCOUNT_COLORS = {
  premium: COLORS.warning,
  free: COLORS.primary,
};

export const UserStatisticsCharts: React.FC<UserStatisticsChartsProps> = ({ loading: parentLoading }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState({
    statusDistribution: [] as { name: string; value: number; color: string }[],
    accountTypeDistribution: [] as { name: string; value: number; color: string }[],
    monthlyGrowth: [] as { month: string; users: number }[],
    xpDistribution: [] as { range: string; count: number }[],
  });

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await userService.getUserCharts();

        // 1. Status Distribution
        const statusMap: Record<string, { name: string; color: string }> = {
          'active': { name: 'Đang hoạt động', color: STATUS_COLORS.active },
          'inactive': { name: 'Tạm khóa', color: STATUS_COLORS.inactive },
          'banned': { name: 'Bị cấm', color: STATUS_COLORS.banned },
        };

        const statusData = data.StatusDistribution.map(item => ({
          name: statusMap[item.status]?.name || item.status,
          value: item.count,
          color: statusMap[item.status]?.color || COLORS.primary,
        })).filter(item => item.value > 0);

        // 2. Account Type Distribution
        const accountTypeMap: Record<string, { name: string; color: string }> = {
          'premium': { name: 'Premium', color: ACCOUNT_COLORS.premium },
          'free': { name: 'Miễn phí', color: ACCOUNT_COLORS.free },
        };

        const accountTypeData = data.AccountTypeDistribution.map(item => ({
          name: accountTypeMap[item.accountType]?.name || item.accountType,
          value: item.count,
          color: accountTypeMap[item.accountType]?.color || COLORS.primary,
        }));

        // 3. Monthly Growth - format month names
        const monthlyData = data.MonthlyGrowth.map(item => {
          const [year, month] = item.month.split('-');
          const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
          return {
            month: monthNames[parseInt(month) - 1],
            users: item.count,
          };
        });

        // 4. XP Distribution
        const xpData = data.XpDistribution.map(item => ({
          range: item.range,
          count: item.count,
        }));

        setChartData({
          statusDistribution: statusData,
          accountTypeDistribution: accountTypeData,
          monthlyGrowth: monthlyData,
          xpDistribution: xpData,
        });
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Không thể tải dữ liệu biểu đồ. Vui lòng thử lại sau.');
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

  if (chartData.statusDistribution.length === 0 && chartData.accountTypeDistribution.length === 0) {
    return (
      <Alert className="rounded-xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Không có dữ liệu để hiển thị biểu đồ
        </AlertDescription>
      </Alert>
    );
  }

  // Custom tooltip
  interface TooltipPayload {
    name: string;
    value: number;
    color?: string;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl shadow-2xl border-2 border-blue-200 dark:border-blue-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {payload[0].name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Số lượng: <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{payload[0].value}</span>
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
      {/* Row 1: Status & Account Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50 dark:from-gray-800 dark:via-green-900/10 dark:to-emerald-900/10 border-2 border-green-100 dark:border-green-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Phân bố trạng thái
                </CardTitle>
                <CardDescription className="text-sm">Tỷ lệ trạng thái tài khoản người dùng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {chartData.statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}: <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Type Distribution Pie Chart */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-amber-50/30 to-orange-50/50 dark:from-gray-800 dark:via-amber-900/10 dark:to-orange-900/10 border-2 border-amber-100 dark:border-amber-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Phân bố loại tài khoản
                </CardTitle>
                <CardDescription className="text-sm">Tỷ lệ tài khoản Premium và Miễn phí</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.accountTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.accountTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {chartData.accountTypeDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}: <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Monthly Growth & XP Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Growth Bar Chart - Better for sparse data */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 dark:from-gray-800 dark:via-blue-900/10 dark:to-indigo-900/10 border-2 border-blue-100 dark:border-blue-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Tăng trưởng theo tháng
                </CardTitle>
                <CardDescription className="text-sm">Số người dùng mới theo từng tháng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.monthlyGrowth.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Chưa có dữ liệu tăng trưởng</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.monthlyGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMonthlyBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="opacity-50" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={{ stroke: '#d1d5db' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #3B82F6',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
                    }}
                    formatter={(value: number) => [`${value} người dùng`, 'Số lượng']}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  />
                  <Bar 
                    dataKey="users" 
                    fill="url(#colorMonthlyBar)" 
                    radius={[8, 8, 0, 0]}
                    name="Người dùng mới"
                    maxBarSize={60}
                    label={{
                      position: 'top',
                      fill: '#3B82F6',
                      fontWeight: 'bold',
                      fontSize: 14
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            
            {/* Summary stats */}
            {chartData.monthlyGrowth.length > 0 && (
              <div className="mt-4 flex justify-center gap-4">
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tổng: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {chartData.monthlyGrowth.reduce((sum, item) => sum + item.users, 0)}
                  </span>
                </div>
                <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">TB/tháng: </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.round(chartData.monthlyGrowth.reduce((sum, item) => sum + item.users, 0) / chartData.monthlyGrowth.length)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* XP Distribution - Horizontal Bar Chart for better readability */}
        <Card className="rounded-2xl bg-gradient-to-br from-white via-purple-50/30 to-pink-50/50 dark:from-gray-800 dark:via-purple-900/10 dark:to-pink-900/10 border-2 border-purple-100 dark:border-purple-900/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/30">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Phân bố điểm XP
                </CardTitle>
                <CardDescription className="text-sm">Số người dùng theo mức điểm kinh nghiệm</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.xpDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Chưa có dữ liệu điểm XP</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={chartData.xpDistribution} 
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
                >
                  <defs>
                    {chartData.xpDistribution.map((_, index) => (
                      <linearGradient key={`xpGradient-${index}`} id={`xpGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={`hsl(${270 + index * 15}, 70%, 60%)`} stopOpacity={1}/>
                        <stop offset="100%" stopColor={`hsl(${290 + index * 15}, 80%, 55%)`} stopOpacity={1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="range" 
                    stroke="#6b7280"
                    style={{ fontSize: '11px', fontWeight: '600' }}
                    width={70}
                    axisLine={{ stroke: '#d1d5db' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #8B5CF6',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(139, 92, 246, 0.2)'
                    }}
                    formatter={(value: number) => [`${value} người dùng`, 'Số lượng']}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 8, 8, 0]}
                    name="Số người dùng"
                    maxBarSize={35}
                    label={{
                      position: 'right',
                      fill: '#7c3aed',
                      fontWeight: 'bold',
                      fontSize: 12
                    }}
                  >
                    {chartData.xpDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#xpGradient-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            
            {/* Summary legend */}
            {chartData.xpDistribution.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Tổng người dùng: </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {chartData.xpDistribution.reduce((sum, item) => sum + item.count, 0)}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 rounded-lg border border-pink-200 dark:border-pink-800">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Nhóm đông nhất: </span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">
                    {chartData.xpDistribution.reduce((max, item) => item.count > max.count ? item : max, chartData.xpDistribution[0])?.range || 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};