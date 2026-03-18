import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Target, TrendingUp } from 'lucide-react';
import statisticsService, { SystemStatistics } from '@/services/statisticsService';

interface StatisticsOverviewProps {
  compact?: boolean;
}

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({ compact = false }) => {
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await statisticsService.getSystemStatistics();
        setStatistics(data);
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  const stats = statistics ? [
    {
      label: "Người dùng",
      value: formatNumber(statistics.TotalUsers),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "Bài test",
      value: formatNumber(statistics.TotalTests),
      icon: BookOpen,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "Lượt làm bài",
      value: formatNumber(statistics.TotalCompletions),
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      label: "Bài tập",
      value: formatNumber(statistics.TotalExercises),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatisticsOverview;
