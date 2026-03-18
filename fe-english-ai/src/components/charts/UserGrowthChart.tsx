import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import statisticsService, { UserGrowthData } from '@/services/statisticsService';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const UserGrowthChart: React.FC = () => {
  const [data, setData] = useState<UserGrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserGrowthData = async () => {
      try {
        setLoading(true);
        setError(null);
        const growthData = await statisticsService.getUserGrowth();
        
        // If no data from API, use empty array
        if (!growthData || growthData.length === 0) {
          // Generate empty data for all 12 months
          const emptyData: UserGrowthData[] = Array.from({ length: 12 }, (_, i) => ({
            Month: `T${i + 1}`,
            NewUsers: 0,
            ActiveUsers: 0
          }));
          setData(emptyData);
        } else {
          setData(growthData);
        }
      } catch (err) {
        console.error('Error fetching user growth data:', err);
        setError('Không thể tải dữ liệu tăng trưởng người dùng. Hiển thị dữ liệu trống.');
        
        // Show empty data instead of error
        const emptyData: UserGrowthData[] = Array.from({ length: 12 }, (_, i) => ({
          Month: `T${i + 1}`,
          NewUsers: 0,
          ActiveUsers: 0
        }));
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGrowthData();
  }, []);

  return (
    <Card className="rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          Biểu đồ Tăng trưởng Người dùng
          <span className="text-yellow-500"></span>
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Số lượng user mới theo tháng (12 tháng gần nhất)
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
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="Month" 
                  className="text-gray-600 dark:text-gray-400"
                  label={{ value: 'Tháng', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  label={{ value: 'Số lượng users', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'NewUsers' 
                      ? 'User mới' 
                      : 'User mới vẫn còn active';
                    return [value, label];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                  formatter={(value: string) => {
                    if (value === 'NewUsers') return 'Tổng số user mới';
                    if (value === 'ActiveUsers') return 'Những user mới vẫn còn active';
                    return value;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="NewUsers" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="NewUsers"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ActiveUsers" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="ActiveUsers"
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserGrowthChart;
