import { progressRepository } from "../database/repositories/progress-repository";
import { exerciseRepository } from "../database/repositories/exercise-repository";

type SkillKey = "listening" | "speaking" | "reading" | "writing" | "grammar";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function formatSqlDateTime(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");

  // Keep SQL datetime semantics (no timezone shift on client render).
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function levelByXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 1000) + 1);
}

function weekdayLabel(date: Date): string {
  const day = date.getDay();
  if (day === 0) {
    return "CN";
  }
  return `T${day + 1}`;
}

function normalizeExerciseType(rawType: string): SkillKey {
  const value = rawType.trim().toLowerCase();

  if (!value) {
    return "grammar";
  }

  if (value.includes("listen")) {
    return "listening";
  }

  if (value.includes("speak")) {
    return "speaking";
  }

  if (value.includes("read") || value === "part7") {
    return "reading";
  }

  if (
    value === "writing"
    || value.startsWith("writ")
    || value.includes("write")
    || value.includes("sentence")
  ) {
    return "writing";
  }

  return "grammar";
}

type BuiltProgress = {
  overview: {
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
  statsCompatibility: {
    completedExercises: number;
    totalExercises: number;
    averageScore: number;
    totalStudyTime: number;
    currentStreak: number;
    longestStreak: number;
    level: string;
    experiencePoints: number;
    nextLevelXP: number;
    lastActiveDate: string;
  };
  activitiesCompatibility: Array<{
    id: number;
    date: string;
    type: string;
    topic: string;
    score: number;
    duration: number;
  }>;
  weeklyCompatibility: Array<{
    day: string;
    exercises: number;
    time: number;
  }>;
  userStatsCompatibility: {
    id: string;
    userId: string;
    username: string;
    fullName: string;
    level: number;
    totalXp: number;
    weeklyXp: number;
    monthlyXp: number;
    streakDays: number;
    lastActivity: string;
    exercisesCompleted: number;
    lessonsCompleted: number;
    wordsLearned: number;
    readingScore: number;
    listeningScore: number;
    grammarScore: number;
    vocabularyScore: number;
    achievements: string[];
    updatedAt: string;
    rank: number;
    weeklyRank: number;
    monthlyRank: number;
  };
  userProgressCompatibility: {
    userId: string;
    currentLevel: number;
    currentXp: number;
    xpToNextLevel: number;
    progressPercentage: number;
    weeklyGoal: number;
    weeklyProgress: number;
    monthlyGoal: number;
    monthlyProgress: number;
    streakDays: number;
    exercisesThisWeek: number;
    lessonsThisMonth: number;
    wordsLearnedTotal: number;
    recentAchievements: string[];
  };
};

type BuildProgressOptions = {
  days?: number;
};

async function buildProgressByNguoiDungId(
  nguoiDungId: number,
  options: BuildProgressOptions = {},
): Promise<BuiltProgress | null> {
  const seed = await progressRepository.getSeedByNguoiDungId(nguoiDungId);
  if (!seed) {
    return null;
  }

  const days = Math.min(Math.max(options.days ?? 7, 1), 30);

  const [exerciseSummary, examSummary, exerciseTypeAggregates, examPartAggregates, activities, dailyRows] = await Promise.all([
    progressRepository.getExerciseCompletionSummary(seed.nguoiDungId),
    progressRepository.getExamCompletionSummary(seed.nguoiDungId),
    progressRepository.getExerciseTypeAggregates(seed.nguoiDungId),
    progressRepository.getExamPartAggregates(seed.nguoiDungId),
    progressRepository.getRecentActivities(seed.nguoiDungId, 20),
    progressRepository.getDailyProgressLastDays(seed.nguoiDungId, days),
  ]);

  const skillOrder: SkillKey[] = ["listening", "speaking", "reading", "writing", "grammar"];
  const skillLabel: Record<SkillKey, string> = {
    listening: "Nghe",
    speaking: "Nói",
    reading: "Đọc",
    writing: "Viết",
    grammar: "Ngữ pháp",
  };

  const skillAccumulator = new Map<SkillKey, {
    completedCount: number;
    totalScoreWeighted: number;
    totalMinutes: number;
    lastCompletedAt: Date | null;
  }>();

  for (const skill of skillOrder) {
    skillAccumulator.set(skill, {
      completedCount: 0,
      totalScoreWeighted: 0,
      totalMinutes: 0,
      lastCompletedAt: null,
    });
  }

  for (const row of exerciseTypeAggregates) {
    const skill = normalizeExerciseType(row.exerciseType);
    const bucket = skillAccumulator.get(skill);
    if (!bucket) {
      continue;
    }

    bucket.completedCount += Number(row.completedCount) || 0;
    bucket.totalScoreWeighted += (Number(row.averageScore) || 0) * (Number(row.completedCount) || 0);
    bucket.totalMinutes += Number(row.totalMinutes) || 0;
    if (!bucket.lastCompletedAt || (row.lastCompletedAt && row.lastCompletedAt > bucket.lastCompletedAt)) {
      bucket.lastCompletedAt = row.lastCompletedAt;
    }
  }

  const exerciseBySkill = skillOrder.map((skill) => {
    const bucket = skillAccumulator.get(skill)!;
    return {
      skill,
      label: skillLabel[skill],
      completedCount: bucket.completedCount,
      averageScore: bucket.completedCount > 0 ? round(bucket.totalScoreWeighted / bucket.completedCount) : 0,
      totalMinutes: bucket.totalMinutes,
      lastCompletedAt: toIso(bucket.lastCompletedAt),
    };
  });

  const partLookup = new Map<number, { attemptCount: number; averageScore: number }>();
  for (const row of examPartAggregates) {
    partLookup.set(Number(row.partNumber), {
      attemptCount: Number(row.attemptCount) || 0,
      averageScore: round(Number(row.averageScore) || 0),
    });
  }

  const partBreakdown = Array.from({ length: 7 }, (_, idx) => {
    const partNumber = idx + 1;
    const part = partLookup.get(partNumber);
    return {
      partNumber,
      attemptCount: part?.attemptCount ?? 0,
      averageScore: part?.averageScore ?? 0,
    };
  });

  const weekly = dailyRows.map((row) => ({
    day: weekdayLabel(new Date(row.dateKey)),
    date: new Date(row.dateKey).toISOString().slice(0, 10),
    exercisesCompleted: Number(row.exercisesCompleted) || 0,
    timeSpentMinutes: Number(row.timeSpentMinutes) || 0,
  }));

  const weeklyMinutes = weekly.reduce((sum, day) => sum + day.timeSpentMinutes, 0);
  const weeklyExercises = weekly.reduce((sum, day) => sum + day.exercisesCompleted, 0);
  const today = weekly[weekly.length - 1];
  const todayMinutes = today?.timeSpentMinutes ?? 0;

  const totalExercises = Number(exerciseSummary.totalExercises) || 0;
  const totalExams = Number(examSummary.totalExams) || 0;
  const tongBaiDat = (Number(exerciseSummary.passedExercises) || 0) + (Number(examSummary.passedExams) || 0);
  const tongBaiDaLamTong = totalExercises + totalExams;
  const tongBaiKhongDat = Math.max(0, tongBaiDaLamTong - tongBaiDat);
  const tongPhutHoc = (Number(exerciseSummary.totalMinutes) || 0) + (Number(examSummary.totalMinutes) || 0);
  const derivedXp = Math.max(
    0,
    Math.round(
      totalExercises * 12
      + totalExams * 40
      + tongBaiDat * 8
      + tongPhutHoc * 0.5,
    ),
  );
  const tongXP = Math.max(Number(seed.tongXP) || 0, derivedXp);

  const mucTieuHangNgayPhut = Math.max(15, Number(seed.mucTieuHangNgayPhut) || 30);
  const soNgayDiemDanhLienTiep = Number(seed.soNgayDiemDanhLienTiep) || 0;
  const ngayDiemDanhGanNhat = todayMinutes > 0 ? new Date() : seed.ngayDiemDanhGanNhat;

  await progressRepository.upsertTienDoHocTap({
    nguoiDungId: seed.nguoiDungId,
    tongPhutHoc,
    tongXP,
    tongBaiDaLam: tongBaiDaLamTong,
    tongBaiHoanThanh: tongBaiDaLamTong,
    tongBaiDat,
    tongBaiKhongDat,
    tongDeThiDaLam: totalExams,
    diemTrungBinhDeThi: round(Number(examSummary.averageScore) || 0),
    soNgayDiemDanhLienTiep,
    ngayDiemDanhGanNhat,
    mucTieuHangNgayPhut,
    capDoHienTai: seed.trinhDoHienTai,
  });

  await progressRepository.upsertDiemDanhNgay({
    nguoiDungId: seed.nguoiDungId,
    ngayDiemDanh: new Date(),
    soPhutHoc: todayMinutes,
    xpThuong: Math.max(0, Math.round(todayMinutes / 5)),
    coHoanThanhMucTieu: todayMinutes >= mucTieuHangNgayPhut,
  });

  const mappedActivities: BuiltProgress["overview"]["activities"] = activities.map((row) => {
    const isExam = row.sourceType === "exam";
    const skill: SkillKey | "exam" = isExam ? "exam" : normalizeExerciseType(row.exerciseType ?? "grammar");
    return {
      id: Number(row.id),
      date: formatSqlDateTime(row.completedAt),
      sourceType: row.sourceType,
      skill,
      topic: row.topic ?? (isExam ? "TOEIC Test" : "Bài tập"),
      score: round(Number(row.score) || 0),
      duration: Number(row.timeSpentMinutes) || 0,
    };
  });

  const currentLevelByXp = levelByXp(tongXP);
  const nextLevelXp = currentLevelByXp * 1000;
  const currentXp = tongXP % 1000;
  const progressPercentage = Math.round((currentXp / 1000) * 100);

  const overview = {
    generatedAt: new Date().toISOString(),
    user: {
      nguoiDungId: seed.nguoiDungId,
      taiKhoanId: seed.taiKhoanId,
      displayName: (seed.hoVaTen && seed.hoVaTen.trim().length > 0) ? seed.hoVaTen : seed.tenDangNhap,
      currentLevel: seed.trinhDoHienTai,
      needsPlacementTest: !seed.trinhDoHienTai,
    },
    totals: {
      tongBaiDaLam: tongBaiDaLamTong,
      tongBaiHoanThanh: tongBaiDaLamTong,
      tongBaiDat,
      tongBaiKhongDat,
      tongDeThiDaLam: totalExams,
      tongPhutHoc,
      tongXP,
      diemTrungBinhBaiTap: round(Number(exerciseSummary.averageScore) || 0),
      diemTrungBinhDeThi: round(Number(examSummary.averageScore) || 0),
      mucTieuHangNgayPhut,
      soNgayDiemDanhLienTiep,
    },
    exerciseBySkill,
    exam: {
      totalExams,
      averageScore: round(Number(examSummary.averageScore) || 0),
      partBreakdown,
    },
    weekly,
    activities: mappedActivities,
    reminders: {
      placementTest: {
        show: !seed.trinhDoHienTai,
        message: "Bạn chưa có trình độ hiện tại. Hãy làm đề test trình độ để hệ thống cá nhân hóa lộ trình học chính xác hơn.",
        actionLabel: "Làm test trình độ ngay",
        actionPath: "/test-list",
      },
    },
  };

  return {
    overview,
    statsCompatibility: {
      completedExercises: tongBaiDaLamTong,
      totalExercises: tongBaiDaLamTong,
      averageScore: round(((Number(exerciseSummary.averageScore) || 0) + (Number(examSummary.averageScore) || 0)) / 2),
      totalStudyTime: tongPhutHoc,
      currentStreak: soNgayDiemDanhLienTiep,
      longestStreak: soNgayDiemDanhLienTiep,
      level: `Level ${currentLevelByXp}`,
      experiencePoints: tongXP,
      nextLevelXP: nextLevelXp,
      lastActiveDate: mappedActivities[0]?.date ?? new Date().toISOString(),
    },
    activitiesCompatibility: mappedActivities.map((item) => ({
      id: item.id,
      date: item.date,
      type: item.sourceType === "exam" ? "Exam" : item.skill,
      topic: item.topic,
      score: item.score,
      duration: item.duration,
    })),
    weeklyCompatibility: weekly.map((item) => ({
      day: item.day,
      exercises: item.exercisesCompleted,
      time: item.timeSpentMinutes,
    })),
    userStatsCompatibility: {
      id: String(seed.nguoiDungId),
      userId: String(seed.nguoiDungId),
      username: seed.tenDangNhap,
      fullName: overview.user.displayName,
      level: currentLevelByXp,
      totalXp: tongXP,
      weeklyXp: Math.round(weeklyMinutes * 0.5 + weeklyExercises * 10),
      monthlyXp: tongXP,
      streakDays: soNgayDiemDanhLienTiep,
      lastActivity: mappedActivities[0]?.date ?? new Date().toISOString(),
      exercisesCompleted: tongBaiDaLamTong,
      lessonsCompleted: totalExercises,
      wordsLearned: 0,
      readingScore: round(exerciseBySkill.find((item) => item.skill === "reading")?.averageScore ?? 0),
      listeningScore: round(exerciseBySkill.find((item) => item.skill === "listening")?.averageScore ?? 0),
      grammarScore: round(exerciseBySkill.find((item) => item.skill === "grammar")?.averageScore ?? 0),
      vocabularyScore: round(exerciseBySkill.find((item) => item.skill === "grammar")?.averageScore ?? 0),
      achievements: [],
      updatedAt: new Date().toISOString(),
      rank: 0,
      weeklyRank: 0,
      monthlyRank: 0,
    },
    userProgressCompatibility: {
      userId: String(seed.nguoiDungId),
      currentLevel: currentLevelByXp,
      currentXp,
      xpToNextLevel: Math.max(0, 1000 - currentXp),
      progressPercentage,
      weeklyGoal: 300,
      weeklyProgress: Math.round(weeklyMinutes * 0.5 + weeklyExercises * 10),
      monthlyGoal: 1200,
      monthlyProgress: tongXP,
      streakDays: soNgayDiemDanhLienTiep,
      exercisesThisWeek: weeklyExercises,
      lessonsThisMonth: totalExercises,
      wordsLearnedTotal: 0,
      recentAchievements: [],
    },
  };
}

export async function getProgressOverviewByTaiKhoanId(
  taiKhoanId: number,
  options: BuildProgressOptions = {},
) {
  let seed = await progressRepository.getSeedByTaiKhoanId(taiKhoanId);
  if (!seed) {
    await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(taiKhoanId);
    seed = await progressRepository.getSeedByTaiKhoanId(taiKhoanId);
  }

  if (!seed) {
    return null;
  }

  const built = await buildProgressByNguoiDungId(seed.nguoiDungId, options);
  return built?.overview ?? null;
}

export async function getProgressStats(userId: number) {
  const built = await buildProgressByNguoiDungId(userId);
  return built?.statsCompatibility ?? null;
}

export async function getProgressActivities(userId: number, limit: number) {
  const built = await buildProgressByNguoiDungId(userId);
  if (!built) {
    return [];
  }
  return built.activitiesCompatibility.slice(0, Math.max(1, Math.min(limit, 100)));
}

export async function getWeeklyProgress(userId: number) {
  const built = await buildProgressByNguoiDungId(userId);
  return built?.weeklyCompatibility ?? [];
}

export async function getUserStatsCompatibility(userId: number) {
  const built = await buildProgressByNguoiDungId(userId);
  return built?.userStatsCompatibility ?? null;
}

export async function getUserProgressCompatibility(userId: number) {
  const built = await buildProgressByNguoiDungId(userId);
  return built?.userProgressCompatibility ?? null;
}
