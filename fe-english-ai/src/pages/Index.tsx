import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Book,
  GraduationCap,
  MessageCircle,
  Globe,
  FileText,
  TrendingUp,
  Trophy,
  BookOpen,
  Headphones,
  Mic,
  Pencil,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
} from 'lucide-react';
import MainLayout from '@/layouts/MainLayout';
import { useAuth0Integration } from '@/hooks/useAuth0Integration';
import { useDatabaseLeaderboard } from '@/hooks/useDatabaseStats';
import { useLearningInsightsProfile } from '@/hooks/useLearningInsights';
import { useAuth } from '@/components/AuthContext';
import { apiService } from '@/services/api';

const quickActions = [
  {
    title: 'Chat với AI',
    description: 'Hỏi - đáp, giải thích và luyện hội thoại theo chủ đề bạn chọn.',
    icon: MessageCircle,
    path: '/chat',
    accent: 'from-rose-500/20 via-pink-500/10 to-transparent',
    tone: 'text-rose-600',
  },
  {
    title: 'Từ điển thông minh',
    description: 'Tra cứu kèm ví dụ, collocations và ngữ cảnh thực tế.',
    icon: Book,
    path: '/dictionary',
    accent: 'from-amber-500/20 via-orange-500/10 to-transparent',
    tone: 'text-amber-600',
  },
  {
    title: 'Tiến độ học tập',
    description: 'Theo dõi điểm mạnh - điểm cần cải thiện của bạn mỗi tuần.',
    icon: TrendingUp,
    path: '/progress',
    accent: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    tone: 'text-sky-600',
  },
  {
    title: 'Lộ trình học',
    description: 'Xem kế hoạch cá nhân hóa theo điểm yếu và trình độ hiện tại.',
    icon: Sparkles,
    path: '/roadmap',
    accent: 'from-violet-500/20 via-indigo-500/10 to-transparent',
    tone: 'text-indigo-600',
  },
];

const practiceTracks = [
  {
    title: 'Luyện nghe',
    description: 'Nghe đoạn hội thoại thực tế, trả lời câu hỏi kèm giải thích.',
    icon: Headphones,
    path: '/listening',
    tag: 'AI Listening',
  },
  {
    title: 'Luyện nói',
    description: 'Ghi âm, nhận phân tích chi tiết về phát âm và độ trôi chảy.',
    icon: Mic,
    path: '/speaking',
    tag: 'Speaking Coach',
  },
  {
    title: 'Ngữ pháp & Bài tập',
    description: 'Chuỗi bài tập theo trình độ, tập trung vào lỗi phổ biến.',
    icon: GraduationCap,
    path: '/exercises',
    tag: 'Practice Sets',
  },
  {
    title: 'Luyện viết',
    description: 'Nhận gợi ý cải thiện bài viết và sửa lỗi theo ngữ cảnh.',
    icon: Pencil,
    path: '/writing-mode',
    tag: 'Writing Lab',
  },
  {
    title: 'Đọc hiểu',
    description: 'Đề bài theo chủ đề, giúp tăng tốc độ đọc và hiểu sâu.',
    icon: BookOpen,
    path: '/reading-exercises',
    tag: 'Reading Flow',
  },
  {
    title: 'Luyện đề',
    description: 'Kho đề mô phỏng cập nhật, chiến lược làm bài hiệu quả.',
    icon: FileText,
    path: '/test-list',
    tag: 'Exam Mode',
  },
];

type AttendanceSummaryResponse = {
  generatedAt: string;
  days: number;
  summary: {
    totalCheckIns: number;
    totalStars: number;
    currentStreak: number;
    longestStreak: number;
    lastCheckInDate: string | null;
  };
};

const Index = () => {
  useAuth0Integration();
  const { user } = useAuth();

  const leaderboardQuery = useDatabaseLeaderboard('weekly', 5);
  const learningProfileQuery = useLearningInsightsProfile(Boolean(user));
  const leaderboardData = leaderboardQuery.data ?? [];
  const topLearners = leaderboardData.slice(0, 5);

  const attendanceSummaryQuery = useQuery({
    queryKey: ['home-attendance-summary', user?.userId],
    queryFn: async (): Promise<AttendanceSummaryResponse> => {
      return apiService.get<AttendanceSummaryResponse>('/api/progress/attendance?days=84');
    },
    enabled: Boolean(user),
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!user?.userId) {
      return;
    }

    void leaderboardQuery.refetch();
    void attendanceSummaryQuery.refetch();
    void learningProfileQuery.refetch();
  }, [user?.userId]);

  const attendanceStars = attendanceSummaryQuery.data?.summary.totalStars ?? 0;
  const attendanceStreak = attendanceSummaryQuery.data?.summary.currentStreak ?? 0;

  const roadmapCardItems = useMemo(() => {
    const firstStage = learningProfileQuery.data?.roadmap?.duLieu.giaiDoan?.[0];

    if (!firstStage || !Array.isArray(firstStage.hoatDong) || firstStage.hoatDong.length === 0) {
      return [
        {
          title: 'Luyện nghe B1',
          badge: 'Hôm nay',
          badgeClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200',
          description: '3 đoạn hội thoại, 15 câu hỏi kèm giải thích.',
        },
        {
          title: 'Shadowing speaking',
          badge: '15 phút',
          badgeClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200',
          description: 'Phân tích phát âm & nhịp nói theo đoạn mẫu.',
        },
      ];
    }

    return firstStage.hoatDong.slice(0, 2).map((activity, index) => ({
      title: `${activity.kyNang}`,
      badge: index === 0 ? 'Ưu tiên' : activity.tanSuat,
      badgeClass: index === 0
        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'
        : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200',
      description: `${activity.moTa} (${activity.thoiLuongPhut} phút)`,
    }));
  }, [learningProfileQuery.data?.roadmap?.duLieu.giaiDoan]);

  const roadmapSummaryText = learningProfileQuery.data?.roadmap?.duLieu.mucTieuTongQuat
    ?? 'Lộ trình sẽ tự cập nhật từ kết quả làm bài lần đầu và điểm yếu mới nhất của bạn.';

  const leaderboardContent = leaderboardQuery.isLoading ? (
    <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
  ) : topLearners.length === 0 ? (
    <p className="text-sm text-slate-500">Chưa có dữ liệu xếp hạng.</p>
  ) : (
    topLearners.map((entry) => (
      <div key={entry.userId} className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          #{entry.rank} {entry.fullName || entry.username}
        </span>
        <span className="text-slate-500">{(entry.weeklyXp && entry.weeklyXp > 0 ? entry.weeklyXp : entry.totalXp) ?? 0} XP</span>
      </div>
    ))
  );

  const scrollToPracticeTracks = () => {
    const section = document.getElementById('practice-tracks');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,210,233,0.75),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(159,238,255,0.4),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(98,28,47,0.8),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(12,42,59,0.6),_transparent_55%)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
        </div>

        <div className="container relative px-4 md:px-6 pt-12 pb-16 md:pt-16 md:pb-20 font-body">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm shadow-rose-200/40 dark:border-rose-400/30 dark:bg-rose-950/40 dark:text-rose-200">
                <Sparkles className="h-4 w-4" />
                AI English Studio
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-slate-900 dark:text-slate-50">
                DALTK giúp bạn học tiếng Anh theo cách{' '}
                <span className="text-rose-600 dark:text-rose-300">tập trung</span> và{' '}
                <span className="text-sky-600 dark:text-sky-300">thực chiến</span>
              </h1>
              <p className="max-w-[620px] text-lg text-slate-600 dark:text-slate-300">
                <span className="block">Một studio học tập thông minh cho bạn.</span>
                <span className="block">Tạo đề cá nhân hóa, luyện nghe - nói - đọc - viết.</span>
                <span className="block">Theo dõi tiến bộ và cạnh tranh bằng bảng xếp hạng thời gian thực.</span>
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scrollToPracticeTracks}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-white dark:text-slate-900"
                >
                  Bắt đầu luyện tập
                  <ChevronDown className="h-4 w-4" />
                </button>
                <Link
                  to="/roadmap"
                  state={{ scrollToTop: true }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                >
                  Xem lộ trình học
                  <TrendingUp className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Bộ kỹ năng', value: '5+' },
                  { label: 'Top học viên', value: '100+' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="relative"
            >
              <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl shadow-rose-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 p-3 text-white shadow-lg shadow-rose-400/40">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Daily Focus</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">Lộ trình học cá nhân hóa</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {roadmapCardItems.map((item) => (
                    <div
                      key={`${item.title}-${item.badge}`}
                      className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                    </div>
                  ))}

                  <p className="text-xs text-slate-500 dark:text-slate-300">{roadmapSummaryText}</p>

                  <Link
                    to="/roadmap"
                    state={{ scrollToTop: true }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                  >
                    Mở trang lộ trình
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="w-full max-w-sm space-y-3">
                  <Link
                    to="/leaderboard"
                    className="group block rounded-2xl border border-white/70 bg-white/80 p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-center gap-3 text-slate-900 dark:text-slate-100">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Bảng xếp hạng</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Đua top, giữ streak mỗi tuần.</p>
                  </Link>

                  <Link
                    to="/progress#attendance-board"
                    className="group block rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-amber-800/70 dark:bg-amber-950/30"
                  >
                    <div className="flex items-center justify-center gap-3 text-amber-900 dark:text-amber-100">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold">Sao điểm danh</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">{attendanceStars} sao </p>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-10 lg:hidden">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top học viên tuần này</p>
                  <Link to="/leaderboard" className="text-xs font-semibold text-rose-600">
                    Xem bảng xếp hạng
                  </Link>
                </div>
                <div className="mt-4 space-y-3">{leaderboardContent}</div>
              </div>

              <Link
                to="/progress#attendance-board"
                className="block rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800/70 dark:bg-amber-950/30"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Sao điểm danh</p>
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">{attendanceStars}</p>
                <p className="text-xs text-amber-700 dark:text-amber-200">{attendanceStreak} ngày streak</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute right-10 top-10 hidden xl:block">
          <div className="w-64 space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-rose-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top học viên tuần này</p>
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="mt-3 space-y-3">
                {leaderboardQuery.isLoading && <p className="text-xs text-slate-500">Đang tải dữ liệu...</p>}
                {!leaderboardQuery.isLoading && topLearners.length === 0 && (
                  <p className="text-xs text-slate-500">Chưa có dữ liệu xếp hạng.</p>
                )}
                {topLearners.map((entry) => (
                  <div key={entry.userId} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">#{entry.rank}</span>
                    <span className="flex-1 truncate px-2 text-slate-600 dark:text-slate-300">
                      {entry.fullName || entry.username}
                    </span>
                    <span className="text-slate-500">{(entry.weeklyXp && entry.weeklyXp > 0 ? entry.weeklyXp : entry.totalXp) ?? 0} XP</span>
                  </div>
                ))}
              </div>
              <Link to="/leaderboard" className="mt-4 inline-flex items-center text-xs font-semibold text-rose-600">
                Xem chi tiết
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </div>

            <Link
              to="/progress#attendance-board"
              className="block rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-lg shadow-amber-100/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl dark:border-amber-800/70 dark:bg-amber-950/30"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Sao điểm danh</p>
                <Star className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">{attendanceStars}</p>
              <p className="text-xs text-amber-700 dark:text-amber-200">{attendanceStreak} ngày streak</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white dark:bg-slate-950 font-body">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Feature mix
              </div>
              <h2 className="text-3xl md:text-4xl font-display text-slate-900 dark:text-slate-50">
                Mọi công cụ bạn cần, gom gọn trong một
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="block">Luyện tập mỗi ngày, theo dõi tiến độ rõ ràng.</span>
                <span className="block">DALTK giúp bạn đi nhanh mà vẫn đúng hướng.</span>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  to={item.path}
                  state={item.path === '/progress' || item.path === '/roadmap' ? { scrollToTop: true } : undefined}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                  <div className="relative space-y-3">
                    <item.icon className={`h-6 w-6 ${item.tone}`} />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="practice-tracks"
        className="py-12 md:py-16 bg-gradient-to-b from-slate-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950 font-body"
      >
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-rose-500">Skill tracks</p>
              <h2 className="text-3xl md:text-4xl font-display text-slate-900 dark:text-slate-50">
                Các phần luyện tập chuyên sâu
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">Chọn một track và bắt đầu ngay trong hôm nay.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {practiceTracks.map((track) => (
              <Link
                key={track.title}
                to={track.path}
                className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex items-center justify-between">
                  <track.icon className="h-6 w-6 text-slate-900 dark:text-slate-100" />
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
                    {track.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{track.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{track.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
