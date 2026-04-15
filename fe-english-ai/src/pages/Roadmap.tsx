import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearningInsightsProfile, useRefreshLearningInsights } from "@/hooks/useLearningInsights";
import { ArrowLeft, BarChart3, CalendarClock, Compass, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getPriorityVariant(priority: number): "destructive" | "secondary" | "default" {
  if (priority >= 4) {
    return "destructive";
  }

  if (priority >= 2) {
    return "secondary";
  }

  return "default";
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
}

export default function Roadmap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const profileQuery = useLearningInsightsProfile(Boolean(user));
  const refreshMutation = useRefreshLearningInsights();

  const profile = profileQuery.data;

  const topWeaknesses = useMemo(() => {
    return (profile?.weaknesses ?? []).slice(0, 4);
  }, [profile?.weaknesses]);

  const roadmapStages = profile?.roadmap?.duLieu.giaiDoan ?? [];
  const isRefreshing = refreshMutation.isPending || profileQuery.isFetching;

  const quickStats = useMemo(() => {
    return {
      weaknessCount: profile?.weaknesses?.length ?? 0,
      stageCount: roadmapStages.length,
      weeklyPlan: profile?.roadmap?.duLieu.thoiLuongTuan ?? 0,
      updatedAt: profile?.roadmap?.ngayCapNhat ?? profile?.generatedAt ?? null,
    };
  }, [profile?.weaknesses?.length, roadmapStages.length, profile?.roadmap?.duLieu.thoiLuongTuan, profile?.roadmap?.ngayCapNhat, profile?.generatedAt]);

  useEffect(() => {
    const state = location.state as { scrollToTop?: boolean } | null;
    if (state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.key]);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      <main className="container max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
                <Badge className="bg-primary/10 text-primary">Cập nhật: {new Date(profile.generatedAt).toLocaleString("vi-VN")}</Badge>
            </div>
            <h1 className="text-3xl font-bold">Lộ trình học cá nhân hóa</h1>
            <p className="text-muted-foreground">
              Trình độ hiện tại: {profile?.currentLevel ?? user?.currentLevel ?? "Chưa xác định"}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Đang làm mới..." : "Làm mới lộ trình"}
          </Button>
        </div>

        {profileQuery.isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Đang tải lộ trình...</CardTitle>
            </CardHeader>
          </Card>
        )}

        {!profileQuery.isLoading && profileQuery.error && (
          <Card>
            <CardHeader>
              <CardTitle>Không thể tải lộ trình</CardTitle>
              <CardDescription>
                {profileQuery.error instanceof Error ? profileQuery.error.message : "Đã xảy ra lỗi khi tải dữ liệu lộ trình."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!profileQuery.isLoading && !profileQuery.error && profile && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-rose-200/60 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-rose-500" />
                    {profile.roadmap?.tenLoTrinh ?? "Lộ trình đang được xây dựng"}
                  </CardTitle>
                  <CardDescription>
                    {profile.roadmap?.duLieu.mucTieuTongQuat ?? "Hệ thống chưa đủ dữ liệu để tạo lộ trình hoàn chỉnh."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{quickStats.weeklyPlan} tuần</Badge>
                    <Badge variant="outline">{quickStats.stageCount} giai đoạn</Badge>
                    <Badge variant="outline">{quickStats.weaknessCount} điểm yếu</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Cập nhật lộ trình gần nhất: {formatDateTime(quickStats.updatedAt)}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Điểm yếu cần ưu tiên</p>
                        <p className="text-2xl font-semibold">{quickStats.weaknessCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CalendarClock className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Chu kỳ học gợi ý</p>
                        <p className="text-2xl font-semibold">{quickStats.weeklyPlan} tuần</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Điểm yếu ưu tiên
                </CardTitle>
                <CardDescription>{topWeaknesses.length} mục quan trọng nhất để tập trung.</CardDescription>
              </CardHeader>
              <CardContent>
                {topWeaknesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có điểm yếu nổi bật. Tiếp tục luyện tập để hệ thống cập nhật.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {topWeaknesses.map((item) => (
                      <div key={`${item.kieuBaiTap}-${item.khaNang}-${item.chuDeBaiTap ?? "none"}`} className="rounded-lg border p-3 space-y-2 bg-white dark:bg-slate-900/40">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={getPriorityVariant(item.mucDoUuTien)}>Ưu tiên {item.mucDoUuTien}/5</Badge>
                          <span className="text-xs text-muted-foreground">{item.nhanTienTrien}</span>
                        </div>
                        <p className="font-medium">{item.khaNang}{item.chuDeBaiTap ? ` • ${item.chuDeBaiTap}` : ""}</p>
                        <p className="text-sm text-muted-foreground">{item.moTaDiemYeu}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">Sai: {item.soLanSai}</Badge>
                          <Badge variant="outline">Xuất hiện: {item.soLanXuatHien}</Badge>
                          <Badge variant="outline">Điểm TB: {item.diemTrungBinh ?? 0}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-sky-500" />
                  Các giai đoạn lộ trình
                </CardTitle>
                <CardDescription>
                  Tập trung vào mục tiêu, hoạt động chính và chỉ số đánh giá.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roadmapStages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có giai đoạn nào. Hãy bấm “Làm mới lộ trình”.</p>
                )}

                {roadmapStages.map((stage) => (
                  <div key={stage.ten} className="rounded-lg border p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{stage.ten}</p>
                      <Badge variant="outline">{stage.thoiLuongTuan} tuần</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.mucTieu}</p>

                    <div className="space-y-2">
                      {stage.hoatDong.map((activity, index) => (
                        <div key={`${stage.ten}-${activity.kyNang}-${index}`} className="rounded-md border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{activity.kyNang}</span>
                            <span className="text-xs text-muted-foreground">{activity.tanSuat} • {activity.thoiLuongPhut} phút</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{activity.moTa}</p>
                        </div>
                      ))}
                    </div>

                    <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                      {stage.chiSoDanhGia.map((metric, index) => (
                        <li key={`${stage.ten}-metric-${index}`}>{metric}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
