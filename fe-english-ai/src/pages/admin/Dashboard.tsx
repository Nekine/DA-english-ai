import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminManagedExercise, AdminManagedTest, adminContentService } from '@/services/adminContentService';
import { AdminDashboardData, adminService } from '@/services/adminService';
import { AlertCircle, BookOpen, FileText, Trophy, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Granularity = 'day' | 'week' | 'month';

type ChartPoint = {
  label: string;
  value: number;
};

function getAnchorDate(dates: Date[]): Date {
  if (dates.length === 0) {
    return new Date();
  }

  let max = dates[0].getTime();
  for (const date of dates) {
    const timestamp = date.getTime();
    if (timestamp > max) {
      max = timestamp;
    }
  }

  return new Date(max);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function startOfMonth(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(1);
  return result;
}

function dayKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function buildSeries(dates: Date[], granularity: Granularity, anchorDate: Date): ChartPoint[] {
  if (granularity === 'day') {
    const dayCounts = new Map<string, number>();
    for (const date of dates) {
      const key = dayKey(date);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }

    const end = startOfDay(anchorDate);
    const points: ChartPoint[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucket = new Date(end);
      bucket.setDate(end.getDate() - offset);
      const key = dayKey(bucket);
      points.push({
        label: bucket.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        value: dayCounts.get(key) || 0,
      });
    }

    return points;
  }

  if (granularity === 'week') {
    const weekCounts = new Map<string, number>();
    for (const date of dates) {
      const key = weekKey(date);
      weekCounts.set(key, (weekCounts.get(key) || 0) + 1);
    }

    const end = startOfWeek(anchorDate);
    const points: ChartPoint[] = [];
    for (let offset = 7; offset >= 0; offset -= 1) {
      const bucket = new Date(end);
      bucket.setDate(end.getDate() - offset * 7);
      const key = weekKey(bucket);
      points.push({
        label: `T ${bucket.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
        value: weekCounts.get(key) || 0,
      });
    }

    return points;
  }

  const monthCounts = new Map<string, number>();
  for (const date of dates) {
    const key = monthKey(date);
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }

  const end = startOfMonth(anchorDate);
  const points: ChartPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const bucket = new Date(end);
    bucket.setMonth(end.getMonth() - offset);
    const key = monthKey(bucket);
    points.push({
      label: bucket.toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' }),
      value: monthCounts.get(key) || 0,
    });
  }

  return points;
}

const Dashboard = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [exercises, setExercises] = useState<AdminManagedExercise[]>([]);
  const [tests, setTests] = useState<AdminManagedTest[]>([]);
  const [newUserDates, setNewUserDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exerciseGranularity, setExerciseGranularity] = useState<Granularity>('week');
  const [testGranularity, setTestGranularity] = useState<Granularity>('week');
  const [userGranularity, setUserGranularity] = useState<Granularity>('week');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResult, exercisesResult, testsResult, newUsersDatesResult] = await Promise.allSettled([
          adminService.getDashboardData(),
          adminContentService.getExercises(),
          adminContentService.getTests(),
          adminService.getNewUsersCreatedDates(),
        ]);

        if (dashboardResult.status === 'fulfilled') {
          setData(dashboardResult.value);
        } else {
          setData(null);
          setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
        }

        if (exercisesResult.status === 'fulfilled') {
          setExercises(exercisesResult.value);
        } else {
          setExercises([]);
        }

        if (testsResult.status === 'fulfilled') {
          setTests(testsResult.value);
        } else {
          setTests([]);
        }

        if (newUsersDatesResult.status === 'fulfilled') {
          setNewUserDates(newUsersDatesResult.value);
        } else {
          setNewUserDates([]);
        }

        const hasPartialChartDataError =
          exercisesResult.status === 'rejected' || testsResult.status === 'rejected' || newUsersDatesResult.status === 'rejected';

        if (!error && hasPartialChartDataError && dashboardResult.status === 'fulfilled') {
          setError('Một số dữ liệu biểu đồ chưa tải được. Trang đang hiển thị dữ liệu hiện có.');
        }
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const source = data?.systemStats;
    const withFallback = source as (typeof source & { totalTests?: number; TotalTests?: number }) | undefined;

    return {
      totalUsers: Number(source?.totalUsers ?? source?.TotalUsers ?? 0),
      activeUsersToday: Number(source?.ActiveUsersToday ?? source?.activeUsers ?? 0),
      totalExercises: Number(source?.totalExercises ?? source?.TotalExercises ?? 0),
      totalTests: Number(withFallback?.totalTests ?? withFallback?.TotalTests ?? tests.length),
      totalSubmissions: Number(source?.totalResults ?? source?.TotalSubmissions ?? 0),
    };
  }, [data, tests.length]);

  const exerciseSeries = useMemo(() => {
    const dates = exercises
      .map((item) => new Date(item.createdAt))
      .filter((item) => isValidDate(item));
    return buildSeries(dates, exerciseGranularity, getAnchorDate(dates));
  }, [exerciseGranularity, exercises]);

  const testSeries = useMemo(() => {
    const dates = tests
      .map((item) => new Date(item.createdAt))
      .filter((item) => isValidDate(item));
    return buildSeries(dates, testGranularity, getAnchorDate(dates));
  }, [testGranularity, tests]);

  const userSeries = useMemo(() => {
    const dates = newUserDates
      .map((item) => new Date(item))
      .filter((item) => isValidDate(item));
    return buildSeries(dates, userGranularity, getAnchorDate(dates));
  }, [newUserDates, userGranularity]);

  const exerciseTotal = useMemo(() => exerciseSeries.reduce((sum, point) => sum + point.value, 0), [exerciseSeries]);
  const testTotal = useMemo(() => testSeries.reduce((sum, point) => sum + point.value, 0), [testSeries]);
  const userTotal = useMemo(() => userSeries.reduce((sum, point) => sum + point.value, 0), [userSeries]);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng người dùng</p>
            <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Hoạt động hôm nay</p>
            <p className="text-2xl font-bold">{stats.activeUsersToday.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng đề thi</p>
            <p className="text-2xl font-bold">{stats.totalTests.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng bài tập</p>
            <p className="text-2xl font-bold">{stats.totalExercises.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng lượt nộp</p>
            <p className="text-2xl font-bold">{stats.totalSubmissions.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Biểu đồ bài tập đã tạo</CardTitle>
              <Select value={exerciseGranularity} onValueChange={(value: Granularity) => setExerciseGranularity(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Ngày</SelectItem>
                  <SelectItem value="week">Tuần</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng theo bộ lọc</span>
              <Badge variant="outline">{exerciseTotal.toLocaleString('vi-VN')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Biểu đồ đề thi đã tạo</CardTitle>
              <Select value={testGranularity} onValueChange={(value: Granularity) => setTestGranularity(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Ngày</SelectItem>
                  <SelectItem value="week">Tuần</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ea580c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng theo bộ lọc</span>
              <Badge variant="outline">{testTotal.toLocaleString('vi-VN')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Biểu đồ người dùng mới</CardTitle>
              <Select value={userGranularity} onValueChange={(value: Granularity) => setUserGranularity(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Ngày</SelectItem>
                  <SelectItem value="week">Tuần</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng theo bộ lọc</span>
              <Badge variant="outline">{userTotal.toLocaleString('vi-VN')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top học viên</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : (data?.topUsers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu học viên.</p>
          ) : (
            (data?.topUsers ?? []).slice(0, 8).map((u) => (
              <div key={u.userId} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{u.fullName || u.username}</p>
                  <p className="text-xs text-muted-foreground">
                    @{u.username} • Level {u.level} • {u.exercisesCompleted} bài hoàn thành
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{u.totalXp.toLocaleString('vi-VN')} XP</Badge>
                  <Badge className="bg-amber-600">{u.averageScore.toFixed(1)} điểm</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trạng thái hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm">Kết nối DB: {data?.systemHealth?.DatabaseConnection ? 'OK' : 'Lỗi'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-sm">API AI: {data?.systemHealth?.GeminiApiConnection ? 'OK' : 'Lỗi'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Trophy className="h-4 w-4 text-purple-600" />
            <span className="text-sm">Response: {Number(data?.systemHealth?.ResponseTimeMs || 0)} ms</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
