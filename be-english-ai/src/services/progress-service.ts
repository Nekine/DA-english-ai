import { progressRepository } from "../database/repositories/progress-repository";
import { exerciseRepository } from "../database/repositories/exercise-repository";

type SkillKey = "listening" | "speaking" | "reading" | "writing" | "grammar";

type AttendanceSummary = {
  totalCheckIns: number;
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
};

type AttendanceBoardItem = {
  date: string;
  weekday: string;
  checkedIn: boolean;
  minutes: number;
  xpBonus: number;
  goalCompleted: boolean;
  isToday: boolean;
};

type AttendanceSnapshot = AttendanceSummary & {
  board: AttendanceBoardItem[];
};

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

function toDateKeyUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fromDateKeyUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDaysUtc(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetweenDateKeysUtc(from: string, to: string): number {
  const fromTime = fromDateKeyUtc(from).getTime();
  const toTime = fromDateKeyUtc(to).getTime();
  return Math.round((toTime - fromTime) / 86_400_000);
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

function buildAttendanceSnapshot(
  rows: Array<{ dateKey: Date; soPhutHoc: number; xpThuong: number; coHoanThanhMucTieu: boolean | number }>,
  boardDays: number,
): AttendanceSnapshot {
  const normalizedRows = rows
    .map((row) => ({
      key: toDateKeyUtc(new Date(row.dateKey)),
      soPhutHoc: Math.max(0, Number(row.soPhutHoc) || 0),
      xpThuong: Math.max(0, Number(row.xpThuong) || 0),
      coHoanThanhMucTieu: Boolean(row.coHoanThanhMucTieu),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const byDate = new Map<string, { soPhutHoc: number; xpThuong: number; coHoanThanhMucTieu: boolean }>();
  for (const row of normalizedRows) {
    byDate.set(row.key, {
      soPhutHoc: row.soPhutHoc,
      xpThuong: row.xpThuong,
      coHoanThanhMucTieu: row.coHoanThanhMucTieu,
    });
  }

  const keys = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  const totalCheckIns = keys.length;
  const totalStars = totalCheckIns;
  const lastCheckInDate = keys.length > 0 ? (keys[keys.length - 1] ?? null) : null;

  let longestStreak = 0;
  let runningStreak = 0;
  let previousKey: string | null = null;

  for (const key of keys) {
    if (previousKey && daysBetweenDateKeysUtc(previousKey, key) === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
    previousKey = key;
  }

  const todayKey = toDateKeyUtc(new Date());
  const yesterdayKey = toDateKeyUtc(addDaysUtc(fromDateKeyUtc(todayKey), -1));

  let currentStreak = 0;
  if (lastCheckInDate && (lastCheckInDate === todayKey || lastCheckInDate === yesterdayKey)) {
    currentStreak = 1;
    for (let idx = keys.length - 2; idx >= 0; idx -= 1) {
      const nextKey = keys[idx + 1];
      if (!nextKey) {
        break;
      }
      const expectedPrev = addDaysUtc(fromDateKeyUtc(nextKey), -1);
      const expectedPrevKey = toDateKeyUtc(expectedPrev);
      if (keys[idx] !== expectedPrevKey) {
        break;
      }
      currentStreak += 1;
    }
  }

  const safeBoardDays = Math.max(1, Math.min(365, Math.trunc(boardDays)));
  const todayDate = fromDateKeyUtc(todayKey);
  const startDate = addDaysUtc(todayDate, -safeBoardDays + 1);
  const board: AttendanceBoardItem[] = [];

  for (let offset = 0; offset < safeBoardDays; offset += 1) {
    const date = addDaysUtc(startDate, offset);
    const key = toDateKeyUtc(date);
    const row = byDate.get(key);

    board.push({
      date: key,
      weekday: weekdayLabel(date),
      checkedIn: Boolean(row),
      minutes: row?.soPhutHoc ?? 0,
      xpBonus: row?.xpThuong ?? 0,
      goalCompleted: row?.coHoanThanhMucTieu ?? false,
      isToday: key === todayKey,
    });
  }

  return {
    totalCheckIns,
    totalStars,
    currentStreak,
    longestStreak,
    lastCheckInDate,
    board,
  };
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
    attendance: AttendanceSnapshot;
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

type BuildAttendanceOptions = {
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

  const [
    exerciseSummary,
    examSummary,
    exerciseXpSummary,
    examXpSummary,
    exerciseTypeAggregates,
    examPartAggregates,
    activities,
    dailyRows,
    attendanceRows,
  ] = await Promise.all([
    progressRepository.getExerciseCompletionSummary(seed.nguoiDungId),
    progressRepository.getExamCompletionSummary(seed.nguoiDungId),
    progressRepository.getExerciseXpSummary(seed.nguoiDungId),
    progressRepository.getExamXpSummary(seed.nguoiDungId),
    progressRepository.getExerciseTypeAggregates(seed.nguoiDungId),
    progressRepository.getExamPartAggregates(seed.nguoiDungId),
    progressRepository.getRecentActivities(seed.nguoiDungId, 20),
    progressRepository.getDailyProgressLastDays(seed.nguoiDungId, days),
    progressRepository.getAllAttendanceDays(seed.nguoiDungId),
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
  const attendance = buildAttendanceSnapshot(attendanceRows, 84);

  const totalExercises = Number(exerciseSummary.totalExercises) || 0;
  const totalExams = Number(examSummary.totalExams) || 0;
  const tongBaiDat = (Number(exerciseSummary.passedExercises) || 0) + (Number(examSummary.passedExams) || 0);
  const tongBaiDaLamTong = totalExercises + totalExams;
  const tongBaiKhongDat = Math.max(0, tongBaiDaLamTong - tongBaiDat);
  const tongPhutHoc = (Number(exerciseSummary.totalMinutes) || 0) + (Number(examSummary.totalMinutes) || 0);

  // XP for exercises/exams is awarded only on first attempts (LanThu = 1).
  const xpExerciseCount = Number(exerciseXpSummary.totalExercises) || 0;
  const xpExamCount = Number(examXpSummary.totalExams) || 0;
  const xpPassedCount = (Number(exerciseXpSummary.passedExercises) || 0) + (Number(examXpSummary.passedExams) || 0);
  const xpMinutes = (Number(exerciseXpSummary.totalMinutes) || 0) + (Number(examXpSummary.totalMinutes) || 0);

  const derivedXp = Math.max(
    0,
    Math.round(
      xpExerciseCount * 12
      + xpExamCount * 40
      + xpPassedCount * 8
      + xpMinutes * 0.5,
    ),
  );
  const tongXP = Math.max(Number(seed.tongXP) || 0, derivedXp);

  const mucTieuHangNgayPhut = Math.max(15, Number(seed.mucTieuHangNgayPhut) || 30);
  const soNgayDiemDanhLienTiep = attendance.currentStreak;
  const ngayDiemDanhGanNhat = attendance.lastCheckInDate ? fromDateKeyUtc(attendance.lastCheckInDate) : null;

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

  const mappedActivities: BuiltProgress["overview"]["activities"] = activities.map((row) => {
    const isExam = row.sourceType === "exam";
    const skill: SkillKey | "exam" = isExam ? "exam" : normalizeExerciseType(row.exerciseType ?? "grammar");
    return {
      id: Number(row.id),
      date: formatSqlDateTime(row.completedAt),
      sourceType: row.sourceType,
      skill,
      topic: row.topic ?? (isExam ? "Bài thi" : "Bài tập"),
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
    attendance,
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
      longestStreak: attendance.longestStreak,
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

async function resolveNguoiDungIdByTaiKhoanId(taiKhoanId: number): Promise<number | null> {
  let seed = await progressRepository.getSeedByTaiKhoanId(taiKhoanId);
  if (!seed) {
    await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(taiKhoanId);
    seed = await progressRepository.getSeedByTaiKhoanId(taiKhoanId);
  }

  return seed?.nguoiDungId ?? null;
}

async function buildAttendanceByNguoiDungId(
  nguoiDungId: number,
  options: BuildAttendanceOptions = {},
): Promise<{
  generatedAt: string;
  days: number;
  summary: AttendanceSummary;
  board: AttendanceBoardItem[];
}> {
  const days = Math.max(28, Math.min(1825, Math.trunc(options.days ?? 365)));
  const rows = await progressRepository.getAllAttendanceDays(nguoiDungId);
  const snapshot = buildAttendanceSnapshot(rows, days);

  return {
    generatedAt: new Date().toISOString(),
    days,
    summary: {
      totalCheckIns: snapshot.totalCheckIns,
      totalStars: snapshot.totalStars,
      currentStreak: snapshot.currentStreak,
      longestStreak: snapshot.longestStreak,
      lastCheckInDate: snapshot.lastCheckInDate,
    },
    board: snapshot.board,
  };
}

export async function getProgressOverviewByTaiKhoanId(
  taiKhoanId: number,
  options: BuildProgressOptions = {},
) {
  const nguoiDungId = await resolveNguoiDungIdByTaiKhoanId(taiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const built = await buildProgressByNguoiDungId(nguoiDungId, options);
  return built?.overview ?? null;
}

export async function getProgressAttendanceByTaiKhoanId(
  taiKhoanId: number,
  options: BuildAttendanceOptions = {},
) {
  const nguoiDungId = await resolveNguoiDungIdByTaiKhoanId(taiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  return buildAttendanceByNguoiDungId(nguoiDungId, options);
}

export async function recordAttendanceFromCompletionByNguoiDungId(input: {
  nguoiDungId: number;
  completedAt?: Date;
  minutesSpent?: number;
}): Promise<{ created: boolean; checkInDate: string }> {
  const completedAt = input.completedAt ?? new Date();
  const validCompletedAt = Number.isNaN(completedAt.getTime()) ? new Date() : completedAt;
  const seed = await progressRepository.getSeedByNguoiDungId(input.nguoiDungId);
  const dailyGoalMinutes = Math.max(15, Number(seed?.mucTieuHangNgayPhut) || 30);

  const result = await progressRepository.recordAttendanceFromCompletion({
    nguoiDungId: input.nguoiDungId,
    completedAt: validCompletedAt,
    minutesSpent: Math.max(1, Math.trunc(Number(input.minutesSpent) || 1)),
    dailyGoalMinutes,
  });

  return {
    created: result.created,
    checkInDate: toDateKeyUtc(new Date(result.checkInDate)),
  };
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
