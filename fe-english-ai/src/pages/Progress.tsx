import Navbar from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/AuthContext";
import { apiService } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Clock, RefreshCw, Star, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SkillKey = "listening" | "speaking" | "reading" | "writing" | "grammar";

type AttendanceDayItem = {
  date: string;
  weekday: string;
  checkedIn: boolean;
  minutes: number;
  xpBonus: number;
  goalCompleted: boolean;
  isToday: boolean;
};

type AttendanceResponse = {
  generatedAt: string;
  days: number;
  summary: {
    totalCheckIns: number;
    totalStars: number;
    currentStreak: number;
    longestStreak: number;
    lastCheckInDate: string | null;
  };
  board: AttendanceDayItem[];
};

type ProgressOverviewResponse = {
  generatedAt: string;
  user: {
    nguoiDungId: number;
    taiKhoanId: number;
    displayName: string;
    currentLevel: string | null;
    needsPlacementTest: boolean;
  };
  totals: {
    tongBaiDaLam: number;
    tongBaiHoanThanh: number;
    tongBaiDat: number;
    tongBaiKhongDat: number;
    tongDeThiDaLam: number;
    tongPhutHoc: number;
    tongXP: number;
    diemTrungBinhBaiTap: number;
    diemTrungBinhDeThi: number;
    mucTieuHangNgayPhut: number;
    soNgayDiemDanhLienTiep: number;
  };
  attendance: {
    totalCheckIns: number;
    totalStars: number;
    currentStreak: number;
    longestStreak: number;
    lastCheckInDate: string | null;
    board: AttendanceDayItem[];
  };
  exerciseBySkill: Array<{
    skill: SkillKey;
    label: string;
    completedCount: number;
    averageScore: number;
    totalMinutes: number;
    lastCompletedAt: string | null;
  }>;
  exam: {
    totalExams: number;
    averageScore: number;
    partBreakdown: Array<{
      partNumber: number;
      attemptCount: number;
      averageScore: number;
    }>;
  };
  weekly: Array<{
    day: string;
    date: string;
    exercisesCompleted: number;
    timeSpentMinutes: number;
  }>;
  activities: Array<{
    id: number;
    date: string;
    sourceType: "exercise" | "exam";
    skill: SkillKey | "exam";
    topic: string;
    score: number;
    duration: number;
  }>;
  reminders: {
    placementTest: {
      show: boolean;
      message: string;
      actionLabel: string;
      actionPath: string;
    };
  };
};

const skillBadgeClass: Record<SkillKey | "exam", string> = {
  listening: "bg-blue-100 text-blue-700",
  speaking: "bg-violet-100 text-violet-700",
  reading: "bg-emerald-100 text-emerald-700",
  writing: "bg-orange-100 text-orange-700",
  grammar: "bg-pink-100 text-pink-700",
  exam: "bg-slate-100 text-slate-700",
};

const sourceLabel = (sourceType: "exercise" | "exam") =>
  sourceType === "exam" ? "Đề thi" : "Bài tập";

function formatActivityDate(value: string): string {
  const normalized = value.trim();
  const localLikeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (localLikeMatch) {
    const [, year, month, day, hours, minutes, seconds = "00"] = localLikeMatch;
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  if (/z$/i.test(normalized)) {
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsed.getUTCDate()).padStart(2, "0");
    const hours = String(parsed.getUTCHours()).padStart(2, "0");
    const minutes = String(parsed.getUTCMinutes()).padStart(2, "0");
    const seconds = String(parsed.getUTCSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  return parsed.toLocaleString("vi-VN");
}

export default function Progress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chartRangeDays, setChartRangeDays] = useState<7 | 30>(7);
  const [attendanceMonth, setAttendanceMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const {
    data: overview,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["progress-overview", chartRangeDays],
    queryFn: async (): Promise<ProgressOverviewResponse> => {
      return apiService.get<ProgressOverviewResponse>(`/api/progress/overview?days=${chartRangeDays}`);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: attendanceData,
    isFetching: isAttendanceFetching,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ["progress-attendance"],
    queryFn: async (): Promise<AttendanceResponse> => {
      return apiService.get<AttendanceResponse>("/api/progress/attendance?days=365");
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isLoading && window.location.hash === "#attendance-board") {
      const section = document.getElementById("attendance-board");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [isLoading]);

  const weeklyChartData = useMemo(() => {
    if (!overview?.weekly?.length) {
      return [];
    }

    return overview.weekly.map((item) => ({
      label:
        chartRangeDays === 30
          ? new Date(item.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
          : item.day,
      baiDaLam: item.exercisesCompleted,
      phutHoc: item.timeSpentMinutes,
    }));
  }, [overview?.weekly, chartRangeDays]);

  const chartSummaryText = useMemo(() => {
    if (!overview?.weekly?.length) {
      return `Chưa có dữ liệu ${chartRangeDays} ngày gần nhất.`;
    }

    const totalExercises = overview.weekly.reduce((sum, item) => sum + item.exercisesCompleted, 0);
    const totalMinutes = overview.weekly.reduce((sum, item) => sum + item.timeSpentMinutes, 0);
    return `${chartRangeDays} ngày gần nhất: ${totalExercises} bài & đề, ${totalMinutes} phút học.`;
  }, [overview?.weekly, chartRangeDays]);

  const attendance = overview?.attendance ?? {
    totalCheckIns: 0,
    totalStars: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckInDate: null,
    board: [] as AttendanceDayItem[],
  };

  const mergedAttendance = {
    totalStars: attendanceData?.summary.totalStars ?? attendance.totalStars,
    currentStreak: attendanceData?.summary.currentStreak ?? attendance.currentStreak,
    longestStreak: attendanceData?.summary.longestStreak ?? attendance.longestStreak,
    lastCheckInDate: attendanceData?.summary.lastCheckInDate ?? attendance.lastCheckInDate,
    board: attendanceData?.board ?? attendance.board,
  };

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceDayItem>();
    for (const day of mergedAttendance.board) {
      map.set(day.date, day);
    }
    return map;
  }, [mergedAttendance.board]);

  const attendanceMonthBounds = useMemo(() => {
    if (mergedAttendance.board.length === 0) {
      return null;
    }

    const firstDate = new Date(`${mergedAttendance.board[0]?.date}T00:00:00`);
    const lastDate = new Date(`${mergedAttendance.board[mergedAttendance.board.length - 1]?.date}T00:00:00`);

    if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) {
      return null;
    }

    return {
      min: new Date(firstDate.getFullYear(), firstDate.getMonth(), 1),
      max: new Date(lastDate.getFullYear(), lastDate.getMonth(), 1),
    };
  }, [mergedAttendance.board]);

  const monthTitle = useMemo(() => {
    return attendanceMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  }, [attendanceMonth]);

  const attendanceMonthCells = useMemo(() => {
    const year = attendanceMonth.getFullYear();
    const month = attendanceMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const cells: Array<{ key: string; day: AttendanceDayItem | null; dayNumber: number | null }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ key: `empty-${i}`, day: null, dayNumber: null });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(year, month, dayNumber);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      cells.push({
        key: dateKey,
        day: attendanceByDate.get(dateKey) ?? null,
        dayNumber,
      });
    }

    return cells;
  }, [attendanceMonth, attendanceByDate]);

  const canGoPrevMonth = attendanceMonthBounds
    ? attendanceMonth.getTime() > attendanceMonthBounds.min.getTime()
    : false;
  const canGoNextMonth = attendanceMonthBounds
    ? attendanceMonth.getTime() < attendanceMonthBounds.max.getTime()
    : false;

  const goPrevMonth = () => {
    setAttendanceMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setAttendanceMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    if (!attendanceMonthBounds) {
      return;
    }

    if (attendanceMonth.getTime() < attendanceMonthBounds.min.getTime()) {
      setAttendanceMonth(attendanceMonthBounds.min);
      return;
    }

    if (attendanceMonth.getTime() > attendanceMonthBounds.max.getTime()) {
      setAttendanceMonth(attendanceMonthBounds.max);
    }
  }, [attendanceMonth, attendanceMonthBounds]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navbar />
        <main className="container max-w-screen-lg mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ học tập</CardTitle>
              <CardDescription>Bạn cần đăng nhập để xem tiến độ học tập.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navbar />
        <main className="container max-w-screen-lg mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Đang tải tiến độ học tập...</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navbar />
        <main className="container max-w-screen-lg mx-auto px-4 py-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Không thể tải tiến độ</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : "Hệ thống chưa có dữ liệu tiến độ cho tài khoản này."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  void refetch();
                  void refetchAttendance();
                }}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tải lại
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      <main className="container max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
              <Badge className="bg-primary/10 text-primary">Cập nhật: {new Date(overview.generatedAt).toLocaleString("vi-VN")}</Badge>
            </div>
            <h1 className="text-3xl font-bold">Tiến độ học tập của {overview.user.displayName}</h1>
            <p className="text-muted-foreground">
              Trình độ hiện tại: {overview.user.currentLevel ?? "Chưa biết"}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              void refetch();
              void refetchAttendance();
            }}
            disabled={isFetching || isAttendanceFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isFetching || isAttendanceFetching) ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {overview.reminders.placementTest.show && (
          <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
            <Target className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span className="text-amber-900 dark:text-amber-100">{overview.reminders.placementTest.message}</span>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
                onClick={() => navigate(overview.reminders.placementTest.actionPath)}
              >
                {overview.reminders.placementTest.actionLabel}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng bài và đề đã làm</CardDescription>
              <CardTitle className="text-3xl">{overview.totals.tongBaiDaLam}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Đạt: {overview.totals.tongBaiDat} | Chưa đạt: {overview.totals.tongBaiKhongDat}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng đề thi đã làm</CardDescription>
              <CardTitle className="text-3xl">{overview.totals.tongDeThiDaLam}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Điểm TB đề thi: {overview.totals.diemTrungBinhDeThi}%
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng phút học</CardDescription>
              <CardTitle className="text-3xl">{overview.totals.tongPhutHoc}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Mục tiêu/ngày: {overview.totals.mucTieuHangNgayPhut} phút
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng XP</CardDescription>
              <CardTitle className="text-3xl">{overview.totals.tongXP}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Điểm TB bài tập: {overview.totals.diemTrungBinhBaiTap}%
            </CardContent>
          </Card>
        </div>

        <Card id="attendance-board">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Bảng điểm danh hàng ngày
            </CardTitle>
            <CardDescription>
              Điểm danh được tính khi bạn hoàn thành bài tập hoặc đề thi đầu tiên trong ngày.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Tổng sao</p>
                <p className="text-2xl font-bold text-amber-600">{mergedAttendance.totalStars}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Streak hiện tại</p>
                <p className="text-2xl font-bold">{mergedAttendance.currentStreak} ngày</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Streak dài nhất</p>
                <p className="text-2xl font-bold">{mergedAttendance.longestStreak} ngày</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Điểm danh gần nhất</p>
                <p className="text-base font-semibold">
                  {mergedAttendance.lastCheckInDate
                    ? new Date(mergedAttendance.lastCheckInDate).toLocaleDateString("vi-VN")
                    : "Chưa có"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={goPrevMonth} disabled={!canGoPrevMonth}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Tháng trước
                </Button>
                <p className="text-sm font-semibold capitalize">{monthTitle}</p>
                <Button variant="outline" size="sm" onClick={goNextMonth} disabled={!canGoNextMonth}>
                  Tháng sau
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2 text-xs text-muted-foreground">
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label) => (
                  <div key={label} className="text-center font-medium">{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {attendanceMonthCells.map((cell) => (
                  <div
                    key={cell.key}
                    title={cell.day
                      ? `${cell.day.date} - ${cell.day.checkedIn ? "Đã điểm danh" : "Chưa điểm danh"}`
                      : ""
                    }
                    className={[
                      "h-10 rounded-md border flex items-center justify-center text-xs font-semibold",
                      cell.dayNumber === null ? "border-transparent bg-transparent" : "",
                      cell.day && cell.day.checkedIn
                        ? (cell.day.goalCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-amber-400 border-amber-400 text-slate-900")
                        : (cell.dayNumber !== null ? "bg-slate-100 border-slate-200 text-slate-500" : ""),
                      cell.day?.isToday ? "ring-2 ring-primary ring-offset-1" : "",
                    ].join(" ")}
                  >
                    {cell.dayNumber ?? ""}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-400 border border-amber-400" />Đã điểm danh</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500 border border-emerald-500" />Đạt mục tiêu phút học</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-slate-100 border border-slate-200" />Chưa điểm danh</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Bài tập theo kỹ năng
            </CardTitle>
            <CardDescription>Tách rõ nghe, nói, đọc, viết, ngữ pháp theo dữ liệu làm bài thực tế.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {overview.exerciseBySkill.map((item) => (
              <div key={item.skill} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  <Badge className={skillBadgeClass[item.skill]}>{item.completedCount} bài</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Điểm TB: {item.averageScore}%</p>
                <p className="text-sm text-muted-foreground">Thời gian: {item.totalMinutes} phút</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Đề thi theo từng Part
              </CardTitle>
              <CardDescription>
                Mỗi Part đã làm bao nhiêu lần đề và điểm trung bình theo Part.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Số lần làm</TableHead>
                    <TableHead>Điểm TB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.exam.partBreakdown.map((part) => (
                    <TableRow key={part.partNumber}>
                      <TableCell>Part {part.partNumber}</TableCell>
                      <TableCell>{part.attemptCount}</TableCell>
                      <TableCell>{part.averageScore}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Hoạt động {chartRangeDays} ngày gần nhất
              </CardTitle>
              <CardDescription>Tổng số bài & đề và thời gian học theo ngày.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="baiDaLam" stroke="#2563eb" strokeWidth={2} name="Bài & đề đã làm" />
                  <Line type="monotone" dataKey="phutHoc" stroke="#db2777" strokeWidth={2} name="Phút học" />
                </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={chartRangeDays === 7 ? "default" : "outline"}
                    onClick={() => setChartRangeDays(7)}
                  >
                    7 ngày gần nhất
                  </Button>
                  <Button
                    size="sm"
                    variant={chartRangeDays === 30 ? "default" : "outline"}
                    onClick={() => setChartRangeDays(30)}
                  >
                    30 ngày gần nhất
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{chartSummaryText}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử hoạt động gần đây</CardTitle>
            <CardDescription>Hiển thị cả bài tập và đề thi đã nộp.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[460px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Chủ đề</TableHead>
                    <TableHead>Điểm</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.activities.map((activity) => (
                    <TableRow key={`${activity.sourceType}-${activity.id}-${activity.date}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={skillBadgeClass[activity.skill]}>{sourceLabel(activity.sourceType)}</Badge>
                          <span className="text-xs text-muted-foreground">{activity.skill === "exam" ? "TOEIC" : activity.skill}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.topic}</TableCell>
                      <TableCell>{activity.score}%</TableCell>
                      <TableCell>{activity.duration} phút</TableCell>
                      <TableCell>{formatActivityDate(activity.date)}</TableCell>
                    </TableRow>
                  ))}
                  {overview.activities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Chưa có hoạt động để hiển thị.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
