import React, { useEffect, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import statisticsService, { RevenuePaymentData } from '@/services/statisticsService';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const RevenuePaymentChart: React.FC = () => {
  const [data, setData] = useState<RevenuePaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenuePaymentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const revenueData = await statisticsService.getRevenuePayment();
        
        // If no data from API, use empty array
        if (!revenueData || revenueData.length === 0) {
          // Generate empty data for all 12 months
          const emptyData: RevenuePaymentData[] = Array.from({ length: 12 }, (_, i) => ({
            Month: `T${i + 1}`,
            Revenue: 0,
            TotalPayments: 0,
            PendingAmount: 0,
            FailedAmount: 0
          }));
          setData(emptyData);
        } else {
          setData(revenueData);
        }
      } catch (err) {
        console.error('Error fetching revenue payment data:', err);
        setError('Không thể tải dữ liệu doanh thu & thanh toán. Hiển thị dữ liệu trống.');
        
        // Show empty data instead of error
        const emptyData: RevenuePaymentData[] = Array.from({ length: 12 }, (_, i) => ({
          Month: `T${i + 1}`,
          Revenue: 0,
          TotalPayments: 0,
          PendingAmount: 0,
          FailedAmount: 0
        }));
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenuePaymentData();
  }, []);

  // Format currency to millions VND
  const formatCurrency = (value: number): string => {
    if (value === 0) return '0';
    const millions = value / 1000000;
    return `${millions.toFixed(1)}M`;
  };

  return (
    <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
           Biểu đồ Doanh thu & Thanh toán
          <span className="text-yellow-500"></span>
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Doanh thu và số lượng thanh toán theo tháng
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="h-[400px] w-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[400px] w-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Không có dữ liệu</div>
          </div>
        ) : (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 50, left: 30, bottom: 20 }}
                barGap={10}
                barCategoryGap="25%"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="stroke-gray-200 dark:stroke-gray-700" 
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="Month" 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fontSize: 13 }}
                  height={60}
                />
                <YAxis 
                  yAxisId="left"
                  className="text-gray-600 dark:text-gray-400"
                  label={{ 
                    value: 'Doanh thu (VNĐ)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 13, fill: '#64748b' }
                  }}
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  className="text-gray-600 dark:text-gray-400"
                  label={{ 
                    value: 'Số lượng', 
                    angle: 90, 
                    position: 'insideRight',
                    style: { fontSize: 13, fill: '#64748b' }
                  }}
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '8px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Revenue') {
                      return [formatCurrency(value) + ' VNĐ', 'Doanh thu thành công'];
                    }
                    if (name === 'TotalPayments') {
                      return [value, 'Số lượng thanh toán'];
                    }
                    if (name === 'PendingAmount') {
                      return [formatCurrency(value) + ' VNĐ', 'Doanh thu chờ xử lý'];
                    }
                    return [value, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '24px', fontSize: '13px' }}
                  iconType="line"
                  formatter={(value: string) => {
                    if (value === 'Revenue') return ' Doanh thu thành công';
                    if (value === 'TotalPayments') return ' Số lượng thanh toán';
                    if (value === 'PendingAmount') return ' Doanh thu chờ xử lý';
                    return value;
                  }}
                />
                
                {/* Bar for Total Payments Count - màu xanh dương nhạt */}
                <Bar 
                  yAxisId="right"
                  dataKey="TotalPayments" 
                  fill="#60a5fa" 
                  fillOpacity={0.6}
                  name="TotalPayments"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                />
                
                {/* Line for Revenue (completed payments) - xanh lá đậm, đồng bộ với User Growth */}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  name="Revenue"
                  dot={{ 
                    fill: '#10b981', 
                    r: 5, 
                    strokeWidth: 2.5, 
                    stroke: '#ffffff' 
                  }}
                  activeDot={{ r: 7, strokeWidth: 2.5, stroke: '#ffffff' }}
                />
                
                {/* Line for Pending Amount - cam vàng, nét đứt */}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="PendingAmount" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="PendingAmount"
                  dot={{ 
                    fill: '#f59e0b', 
                    r: 4, 
                    strokeWidth: 2, 
                    stroke: '#ffffff' 
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                  strokeDasharray="6 4"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenuePaymentChart;
