import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AdminContentSummary,
  AdminManagedExercise,
  AdminManagedTest,
  adminContentService,
} from '@/services/adminContentService';
import { AlertCircle, BarChart3, BookOpen, FileText, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type ApiError = {
  message?: string;
  response?: {
    status?: number;
  };
};

function extractErrorInfo(error: unknown): { status?: number; message: string } {
  const e = error as ApiError;
  return {
    status: e?.response?.status,
    message: e?.message || 'Lỗi không xác định',
  };
}

function buildLoadErrorMessage(failures: Array<{ label: string; status?: number; message: string }>): string {
  if (failures.some((item) => item.status === 401)) {
    return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
  }

  if (failures.some((item) => item.status === 403)) {
    return 'Tài khoản hiện tại không có quyền truy cập dữ liệu quản trị.';
  }

  if (failures.length === 0) {
    return '';
  }

  if (failures.length === 1) {
    return `Không thể tải ${failures[0].label}: ${failures[0].message}`;
  }

  if (failures.length < 3) {
    const labels = failures.map((item) => item.label).join(', ');
    return `Một phần dữ liệu chưa tải được (${labels}). Vui lòng thử lại.`;
  }

  return 'Không thể tải dữ liệu từ CSDL. Vui lòng thử lại sau.';
}

const UploadPage = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<AdminContentSummary | null>(null);
  const [exercises, setExercises] = useState<AdminManagedExercise[]>([]);
  const [tests, setTests] = useState<AdminManagedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemKey, setDeletingItemKey] = useState<string | null>(null);
  const [selectedExerciseGroup, setSelectedExerciseGroup] = useState<string>('all');
  const [exerciseAttemptFilter, setExerciseAttemptFilter] = useState<'all' | 'unattempted'>('all');
  const [testAttemptFilter, setTestAttemptFilter] = useState<'all' | 'unattempted'>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryResult, exercisesResult, testsResult] = await Promise.allSettled([
        adminContentService.getSummary(),
        adminContentService.getExercises(),
        adminContentService.getTests(),
      ]);

      const failures: Array<{ label: string; status?: number; message: string }> = [];

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        setSummary(null);
        const info = extractErrorInfo(summaryResult.reason);
        failures.push({ label: 'tổng quan', status: info.status, message: info.message });
      }

      if (exercisesResult.status === 'fulfilled') {
        setExercises(exercisesResult.value);
      } else {
        setExercises([]);
        const info = extractErrorInfo(exercisesResult.reason);
        failures.push({ label: 'danh sách bài tập', status: info.status, message: info.message });
      }

      if (testsResult.status === 'fulfilled') {
        setTests(testsResult.value);
      } else {
        setTests([]);
        const info = extractErrorInfo(testsResult.reason);
        failures.push({ label: 'danh sách đề thi', status: info.status, message: info.message });
      }

      if (failures.length > 0) {
        setError(buildLoadErrorMessage(failures));
      }
    } catch (err) {
      console.error('Failed to load admin content data:', err);
      const info = extractErrorInfo(err);
      if (info.status === 401) {
        setError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      } else if (info.status === 403) {
        setError('Tài khoản hiện tại không có quyền truy cập dữ liệu quản trị.');
      } else {
        setError('Không thể tải dữ liệu từ CSDL. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exerciseChartData = useMemo(
    () => [
      { period: 'Hôm nay', value: summary?.exercisesCreated.today ?? 0 },
      { period: 'Tuần', value: summary?.exercisesCreated.week ?? 0 },
      { period: 'Tháng', value: summary?.exercisesCreated.month ?? 0 },
    ],
    [summary],
  );

  const testChartData = useMemo(
    () => [
      { period: 'Hôm nay', value: summary?.testsCreated.today ?? 0 },
      { period: 'Tuần', value: summary?.testsCreated.week ?? 0 },
      { period: 'Tháng', value: summary?.testsCreated.month ?? 0 },
    ],
    [summary],
  );

  const visibleExercises = useMemo(() => {
    if (exerciseAttemptFilter === 'unattempted') {
      return exercises.filter((item) => item.attemptCount === 0);
    }

    return exercises;
  }, [exerciseAttemptFilter, exercises]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, AdminManagedExercise[]> = {};

    for (const exercise of visibleExercises) {
      const key = exercise.exerciseType || 'khac';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(exercise);
    }

    return groups;
  }, [visibleExercises]);

  const exerciseGroupOptions = useMemo(() => {
    return Object.entries(groupedExercises)
      .map(([key, items]) => ({ key, label: key.replace(/_/g, ' '), count: items.length }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [groupedExercises]);

  const visibleExerciseGroups = useMemo(() => {
    if (selectedExerciseGroup === 'all') {
      return Object.entries(groupedExercises);
    }

    const items = groupedExercises[selectedExerciseGroup] ?? [];
    return [[selectedExerciseGroup, items]] as Array<[string, AdminManagedExercise[]]>;
  }, [groupedExercises, selectedExerciseGroup]);

  useEffect(() => {
    if (selectedExerciseGroup === 'all') {
      return;
    }

    if (!groupedExercises[selectedExerciseGroup]) {
      setSelectedExerciseGroup('all');
    }
  }, [groupedExercises, selectedExerciseGroup]);

  const visibleTests = useMemo(() => {
    if (testAttemptFilter === 'unattempted') {
      return tests.filter((item) => item.attemptCount === 0);
    }

    return tests;
  }, [testAttemptFilter, tests]);

  const handleDeleteExercise = async (item: AdminManagedExercise) => {
    const accepted = window.confirm(`Xóa bài tập "${item.title}"?`);
    if (!accepted) {
      return;
    }

    try {
      setDeletingItemKey(`exercise-${item.id}`);
      await adminContentService.deleteExercise(item.id);
      await loadData();
      toast({ title: 'Đã xóa bài tập', description: `Bài tập #${item.id} đã được xóa.` });
    } catch (err) {
      console.error('Delete exercise failed:', err);
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể xóa bài tập. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setDeletingItemKey(null);
    }
  };

  const handleDeleteTest = async (item: AdminManagedTest) => {
    const accepted = window.confirm(`Xóa đề thi "${item.title}"?`);
    if (!accepted) {
      return;
    }

    try {
      setDeletingItemKey(`test-${item.id}`);
      await adminContentService.deleteTest(item.id);
      await loadData();
      toast({ title: 'Đã xóa đề thi', description: `Đề thi #${item.id} đã được xóa.` });
    } catch (err) {
      console.error('Delete test failed:', err);
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể xóa đề thi. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setDeletingItemKey(null);
    }
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN');
  };

  const statusBadge = (value: string) => {
    if (value === 'active' || value === 'generated') {
      return <Badge className="bg-green-600">Đang hoạt động</Badge>;
    }

    if (value === 'draft') {
      return <Badge variant="secondary">Bản nháp</Badge>;
    }

    return <Badge variant="outline">{value}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bài tập và đề thi</h1>
          <p className="text-sm text-muted-foreground">Quản lý dữ liệu đã tạo trong hệ thống và theo dõi số lượng tạo mới theo thời gian.</p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="outline">
          Làm mới dữ liệu
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng bài tập</p>
                <p className="text-2xl font-bold">{summary?.totalExercises ?? 0}</p>
              </div>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng đề thi</p>
                <p className="text-2xl font-bold">{summary?.totalTests ?? 0}</p>
              </div>
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bài tập mới tuần này</p>
                <p className="text-2xl font-bold">{summary?.exercisesCreated.week ?? 0}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đề thi mới tuần này</p>
                <p className="text-2xl font-bold">{summary?.testsCreated.week ?? 0}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biểu đồ tạo bài tập</CardTitle>
            <CardDescription>So sánh số bài tập tạo trong hôm nay, tuần và tháng.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biểu đồ tạo đề thi</CardTitle>
            <CardDescription>So sánh số đề thi tạo trong hôm nay, tuần và tháng.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ea580c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="exercises" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exercises">Quản lý bài tập</TabsTrigger>
          <TabsTrigger value="tests">Quản lý đề thi</TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Đang tải danh sách bài tập...</CardContent>
            </Card>
          ) : Object.keys(groupedExercises).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Chưa có bài tập nào trong hệ thống.</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bộ lọc bài tập</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Lượt làm</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={exerciseAttemptFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setExerciseAttemptFilter('all')}
                      >
                        Tất cả ({exercises.length})
                      </Button>
                      <Button
                        type="button"
                        variant={exerciseAttemptFilter === 'unattempted' ? 'default' : 'outline'}
                        onClick={() => setExerciseAttemptFilter('unattempted')}
                      >
                        Bài chưa làm ({exercises.filter((item) => item.attemptCount === 0).length})
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Mục theo nhóm bài tập</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={selectedExerciseGroup === 'all' ? 'default' : 'outline'}
                        onClick={() => setSelectedExerciseGroup('all')}
                      >
                        Tất cả ({visibleExercises.length})
                      </Button>

                      {exerciseGroupOptions.map((group) => (
                        <Button
                          key={group.key}
                          type="button"
                          variant={selectedExerciseGroup === group.key ? 'default' : 'outline'}
                          onClick={() => setSelectedExerciseGroup(group.key)}
                        >
                          {group.label} ({group.count})
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {visibleExerciseGroups.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">Không có bài tập phù hợp với bộ lọc hiện tại.</CardContent>
                </Card>
              ) : (
                visibleExerciseGroups.map(([exerciseType, items]) => (
                  <Card key={exerciseType}>
                    <CardHeader>
                      <CardTitle className="text-base">Nhóm: {exerciseType.replace(/_/g, ' ')}</CardTitle>
                      <CardDescription>{items.length} bài tập</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{item.title}</p>
                              <Badge variant="outline">{item.partType}</Badge>
                              <Badge variant="outline">{item.level}</Badge>
                              {statusBadge(item.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ID: {item.id} • Người tạo: {item.creatorUsername} • Số câu: {item.questionCount} • Lượt làm: {item.attemptCount} • Tạo ngày: {formatDate(item.createdAt)}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={deletingItemKey === `exercise-${item.id}`}
                            onClick={() => handleDeleteExercise(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Đang tải danh sách đề thi...</CardContent>
            </Card>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Chưa có đề thi nào trong hệ thống.</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bộ lọc đề thi</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={testAttemptFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setTestAttemptFilter('all')}
                  >
                    Tất cả ({tests.length})
                  </Button>
                  <Button
                    type="button"
                    variant={testAttemptFilter === 'unattempted' ? 'default' : 'outline'}
                    onClick={() => setTestAttemptFilter('unattempted')}
                  >
                    Đề chưa làm ({tests.filter((item) => item.attemptCount === 0).length})
                  </Button>
                </CardContent>
              </Card>

              {visibleTests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">Không có đề thi phù hợp với bộ lọc hiện tại.</CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Danh sách đề thi</CardTitle>
                    <CardDescription>{visibleTests.length} đề thi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visibleTests.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{item.title}</p>
                            <Badge variant="outline">{item.examType}</Badge>
                            {statusBadge(item.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ID: {item.id} • Người tạo: {item.creatorUsername} • Số phần: {item.totalParts} • Số câu: {item.totalQuestions} • Thời gian: {item.durationMinutes} phút • Lượt làm: {item.attemptCount} • Tạo ngày: {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          disabled={deletingItemKey === `test-${item.id}`}
                          onClick={() => handleDeleteTest(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UploadPage;
