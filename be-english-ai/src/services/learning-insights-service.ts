import { appConfig } from "../config";
import {
  learningInsightsRepository,
  type ExercisePerformanceAggregateRow,
  type UserWeaknessInput,
  type UserWeaknessRow,
} from "../database/repositories/learning-insights-repository";
import { exerciseRepository } from "../database/repositories/exercise-repository";
import { generateJsonFromProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";
import { logger } from "../utils/logger";

type RoadmapActivity = {
  kyNang: string;
  moTa: string;
  tanSuat: string;
  thoiLuongPhut: number;
};

type RoadmapStage = {
  ten: string;
  thoiLuongTuan: number;
  mucTieu: string;
  hoatDong: RoadmapActivity[];
  chiSoDanhGia: string[];
};

type LearningRoadmapPayload = {
  tenLoTrinh: string;
  mucTieuTongQuat: string;
  thoiLuongTuan: number;
  giaiDoan: RoadmapStage[];
  khuyenNghiHangNgay: string[];
  mocDanhGia: string[];
};

type LearningProfileResult = {
  generatedAt: string;
  currentLevel: string | null;
  insightPolicy: {
    firstAttemptOnly: boolean;
    minAttemptsForWeakness: number;
    activeWeaknessThreshold: number;
    resolvedWeaknessThreshold: number;
  };
  roadmapPolicy: {
    minUpdateIntervalDays: number;
    forceUpdateIntervalDays: number;
    lastUpdatedAt: string | null;
    nextEligibleUpdateAt: string | null;
    forceRefreshAt: string | null;
    canAutoRegenerateNow: boolean;
  };
  weaknesses: Array<{
    kieuBaiTap: string;
    chuDeBaiTap: string | null;
    khaNang: string;
    moTaDiemYeu: string;
    mucDoUuTien: number;
    soLanXuatHien: number;
    soLanSai: number;
    diemTrungBinh: number | null;
    trangThaiTienTrien: "improving" | "stable" | "at_risk";
    nhanTienTrien: string;
    lanCapNhatCuoi: string;
  }>;
  roadmap: {
    tenLoTrinh: string;
    trangThai: string;
    ngayTao: string;
    ngayCapNhat: string;
    duLieu: LearningRoadmapPayload;
  } | null;
};

type PartSummary = {
  partNumber: number;
  score: number;
  totalQuestions: number;
  wrongAnswers: number;
};

type PerformanceSummary = {
  recentAttemptCount: number;
  averageScore: number;
};

const LEARNING_ROADMAP_PROMPT_FILE = "learning-roadmap.system.prompt.txt";
const MAX_WEAKNESSES = 12;
const MIN_ATTEMPTS_FOR_WEAKNESS = 1;
const ACTIVE_WEAKNESS_THRESHOLD = 78;
const RESOLVED_WEAKNESS_THRESHOLD = 82;
const ROADMAP_MIN_UPDATE_INTERVAL_DAYS = 0;
const ROADMAP_FORCE_UPDATE_INTERVAL_DAYS = 21;
const inFlightRefreshes = new Map<number, Promise<void>>();
const scheduledEndOfDayRefreshes = new Map<number, NodeJS.Timeout>();
const scheduledEndOfDayKeys = new Map<number, string>();

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

function normalizeCefrLevel(value: string | null | undefined): CefrLevel | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if ((CEFR_LEVELS as readonly string[]).includes(normalized)) {
    return normalized as CefrLevel;
  }

  return null;
}

function toLevelBand(level: CefrLevel | null): "foundation" | "intermediate" | "advanced" | "unknown" {
  if (!level) {
    return "unknown";
  }

  if (level === "A1" || level === "A2") {
    return "foundation";
  }

  if (level === "B1" || level === "B2") {
    return "intermediate";
  }

  return "advanced";
}

function getLevelTargetLabel(level: CefrLevel | null): string {
  if (!level) {
    return "mức phù hợp với năng lực hiện tại";
  }

  switch (level) {
    case "A1":
      return "A2";
    case "A2":
      return "B1";
    case "B1":
      return "B2";
    case "B2":
      return "C1";
    case "C1":
      return "C2";
    default:
      return "C2";
  }
}

type RefreshLearningInsightsOptions = {
  forceRoadmapRefresh?: boolean;
};

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toLocalDateKey(dateValue: Date): string {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return toLocalDateKey(left) === toLocalDateKey(right);
}

function getDelayToEndOfDayMs(now: Date): number {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return Math.max(0, endOfDay.getTime() - now.getTime());
}

function getRecencyWeight(dateValue: Date): number {
  const ageMs = Date.now() - dateValue.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  if (ageDays <= 7) {
    return 1.8;
  }

  if (ageDays <= 21) {
    return 1.4;
  }

  if (ageDays <= 45) {
    return 1.1;
  }

  return 0.8;
}

function toNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeSkillByExerciseType(kieuBaiTap: string): string {
  const normalized = kieuBaiTap.trim().toLowerCase();

  if (normalized.includes("grammar") || normalized === "part5" || normalized === "part6") {
    return "Grammar";
  }

  if (normalized.includes("listen")) {
    return "Listening";
  }

  if (normalized.includes("read") || normalized === "part7") {
    return "Reading";
  }

  if (normalized.includes("write") || normalized.includes("sentence")) {
    return "Writing";
  }

  if (normalized.includes("speak")) {
    return "Speaking";
  }

  return "General";
}

function normalizeSkillByPartNumber(partNumber: number): string {
  if (partNumber >= 1 && partNumber <= 4) {
    return "Listening";
  }

  if (partNumber === 5 || partNumber === 6) {
    return "Grammar";
  }

  if (partNumber === 7) {
    return "Reading";
  }

  return "General";
}

function normalizeRoadmapSkill(value: unknown): string {
  const text = toNonEmptyString(value, "General");
  const normalized = text.trim().toLowerCase();

  if (normalized.includes("grammar")) {
    return "Grammar";
  }

  if (normalized.includes("vocab")) {
    return "Vocabulary";
  }

  if (normalized.includes("listen")) {
    return "Listening";
  }

  if (normalized.includes("read")) {
    return "Reading";
  }

  if (normalized.includes("write")) {
    return "Writing";
  }

  if (normalized.includes("speak")) {
    return "Speaking";
  }

  return "General";
}

function toPriorityByScore(score: number): number {
  if (score < 50) {
    return 5;
  }

  if (score < 60) {
    return 4;
  }

  if (score < 70) {
    return 3;
  }

  if (score < 80) {
    return 2;
  }

  return 1;
}

function computePerformanceScore(avgScore: number, totalQuestions: number, totalWrong: number): number {
  if (totalQuestions <= 0) {
    return clamp(avgScore, 0, 100);
  }

  const accuracy = clamp(100 - (totalWrong / totalQuestions) * 100, 0, 100);
  return round2((clamp(avgScore, 0, 100) + accuracy) / 2);
}

function buildWeaknessFromExerciseAggregate(row: ExercisePerformanceAggregateRow): UserWeaknessInput | null {
  const attemptCount = Math.max(0, row.attemptCount ?? 0);
  const totalQuestions = Math.max(0, row.totalQuestions ?? 0);
  const totalWrong = Math.max(0, row.totalWrong ?? 0);
  if (attemptCount < MIN_ATTEMPTS_FOR_WEAKNESS) {
    return null;
  }

  const baseAvgScore = clamp(row.avgScore ?? 0, 0, 100);
  const weightedAvgScore = clamp(row.weightedAvgScore ?? baseAvgScore, 0, 100);
  const score = computePerformanceScore(weightedAvgScore, totalQuestions, totalWrong);
  const wrongRate = totalQuestions > 0 ? totalWrong / totalQuestions : 0;

  if (score >= RESOLVED_WEAKNESS_THRESHOLD) {
    return null;
  }

  if (score >= ACTIVE_WEAKNESS_THRESHOLD && wrongRate <= 0.28) {
    return null;
  }

  const khaNang = normalizeSkillByExerciseType(row.kieuBaiTap);
  const chuDe = row.chuDeBaiTap?.trim() || undefined;
  const scoreLabel = `${round2(score)}%`;

  return {
    kieuBaiTap: row.kieuBaiTap,
    ...(chuDe ? { chuDeBaiTap: chuDe } : {}),
    khaNang,
    moTaDiemYeu:
      chuDe && chuDe.length > 0
        ? `${khaNang}: độ chính xác còn thấp ở chủ đề ${chuDe} (mức hiện tại ${scoreLabel}).`
        : `${khaNang}: độ chính xác còn thấp, cần củng cố nền tảng (mức hiện tại ${scoreLabel}).`,
    mucDoUuTien: toPriorityByScore(score),
    soLanXuatHien: attemptCount,
    soLanSai: totalWrong,
    diemTrungBinh: round2(weightedAvgScore),
  };
}

function extractPartSummaries(ketQuaChamJson: string | null): PartSummary[] {
  const parsed = parseJson<Record<string, unknown>>(ketQuaChamJson);
  if (!parsed) {
    return [];
  }

  const candidates = parsed.partSummaries;
  if (!Array.isArray(candidates)) {
    return [];
  }

  const summaries: PartSummary[] = [];
  for (const item of candidates) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const partNumber = Number(record.partNumber);
    const totalQuestions = Number(record.totalQuestions);
    const correctAnswers = Number(record.correctAnswers);
    const score = Number(record.score);

    if (!Number.isFinite(partNumber) || !Number.isFinite(totalQuestions) || totalQuestions <= 0) {
      continue;
    }

    const validCorrect = Number.isFinite(correctAnswers) ? correctAnswers : 0;
    const wrongAnswers = Math.max(0, Math.trunc(totalQuestions) - Math.max(0, Math.trunc(validCorrect)));

    summaries.push({
      partNumber: Math.trunc(partNumber),
      score: Number.isFinite(score) ? clamp(score, 0, 100) : round2(((totalQuestions - wrongAnswers) / totalQuestions) * 100),
      totalQuestions: Math.max(1, Math.trunc(totalQuestions)),
      wrongAnswers,
    });
  }

  return summaries;
}

function buildWeaknessesFromExamRows(rows: Array<{
  ketQuaChamJson: string | null;
  diemSo: number | null;
  tongSoCau: number | null;
  soCauSai: number | null;
  ngayTao: Date;
}>): UserWeaknessInput[] {
  type Bucket = {
    kieuBaiTap: string;
    khaNang: string;
    attemptCount: number;
    totalQuestions: number;
    totalWrong: number;
    weightedScoreAccumulator: number;
    weightTotal: number;
  };

  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const partSummaries = extractPartSummaries(row.ketQuaChamJson);
    const recencyWeight = getRecencyWeight(row.ngayTao);

    if (partSummaries.length > 0) {
      for (const summary of partSummaries) {
        const key = `test_exam_part_${summary.partNumber}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.attemptCount += 1;
          existing.totalQuestions += summary.totalQuestions;
          existing.totalWrong += summary.wrongAnswers;
          existing.weightedScoreAccumulator += summary.score * recencyWeight;
          existing.weightTotal += recencyWeight;
        } else {
          buckets.set(key, {
            kieuBaiTap: key,
            khaNang: normalizeSkillByPartNumber(summary.partNumber),
            attemptCount: 1,
            totalQuestions: summary.totalQuestions,
            totalWrong: summary.wrongAnswers,
            weightedScoreAccumulator: summary.score * recencyWeight,
            weightTotal: recencyWeight,
          });
        }
      }

      continue;
    }

    const totalQuestions = Math.max(0, Number(row.tongSoCau ?? 0));
    const totalWrong = Math.max(0, Number(row.soCauSai ?? 0));
    const score = clamp(Number(row.diemSo ?? 0), 0, 100);
    const key = "test_exam_overall";

    const existing = buckets.get(key);
    if (existing) {
      existing.attemptCount += 1;
      existing.totalQuestions += totalQuestions;
      existing.totalWrong += totalWrong;
      existing.weightedScoreAccumulator += score * recencyWeight;
      existing.weightTotal += recencyWeight;
    } else {
      buckets.set(key, {
        kieuBaiTap: key,
        khaNang: "General",
        attemptCount: 1,
        totalQuestions,
        totalWrong,
        weightedScoreAccumulator: score * recencyWeight,
        weightTotal: recencyWeight,
      });
    }
  }

  const weaknesses: UserWeaknessInput[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.attemptCount < MIN_ATTEMPTS_FOR_WEAKNESS) {
      continue;
    }

    const weightedAverageScore = bucket.weightTotal > 0
      ? round2(bucket.weightedScoreAccumulator / bucket.weightTotal)
      : 0;
    const score = computePerformanceScore(weightedAverageScore, bucket.totalQuestions, bucket.totalWrong);
    const wrongRate = bucket.totalQuestions > 0 ? bucket.totalWrong / bucket.totalQuestions : 0;

    if (score >= RESOLVED_WEAKNESS_THRESHOLD) {
      continue;
    }

    if (score >= ACTIVE_WEAKNESS_THRESHOLD && wrongRate <= 0.28) {
      continue;
    }

    weaknesses.push({
      kieuBaiTap: bucket.kieuBaiTap,
      khaNang: bucket.khaNang,
      moTaDiemYeu: `${bucket.khaNang}: kết quả làm đề thi còn thấp (mức hiện tại ${round2(score)}%).`,
      mucDoUuTien: toPriorityByScore(score),
      soLanXuatHien: bucket.attemptCount,
      soLanSai: bucket.totalWrong,
      diemTrungBinh: weightedAverageScore,
    });
  }

  return weaknesses;
}

function deduplicateWeaknesses(items: UserWeaknessInput[]): UserWeaknessInput[] {
  const map = new Map<string, UserWeaknessInput>();

  for (const item of items) {
    const key = [
      item.kieuBaiTap.trim().toLowerCase(),
      (item.chuDeBaiTap ?? "").trim().toLowerCase(),
      item.khaNang.trim().toLowerCase(),
      item.moTaDiemYeu.trim().toLowerCase(),
    ].join("|");

    const existing = map.get(key);
    if (existing) {
      existing.soLanXuatHien += Math.max(0, item.soLanXuatHien);
      existing.soLanSai += Math.max(0, item.soLanSai);
      const avgLeft = existing.diemTrungBinh ?? 0;
      const avgRight = item.diemTrungBinh ?? 0;
      existing.diemTrungBinh = round2((avgLeft + avgRight) / 2);
      existing.mucDoUuTien = Math.max(existing.mucDoUuTien, item.mucDoUuTien);
      continue;
    }

    map.set(key, { ...item });
  }

  return [...map.values()]
    .sort((a, b) => {
      if (b.mucDoUuTien !== a.mucDoUuTien) {
        return b.mucDoUuTien - a.mucDoUuTien;
      }
      if (b.soLanSai !== a.soLanSai) {
        return b.soLanSai - a.soLanSai;
      }
      return a.khaNang.localeCompare(b.khaNang);
    })
    .slice(0, MAX_WEAKNESSES);
}

function summarizePerformance(
  exerciseAggregates: ExercisePerformanceAggregateRow[],
  examRows: Array<{ diemSo: number | null }>,
): PerformanceSummary {
  const exerciseScores = exerciseAggregates
    .map((row) => clamp(Number(row.avgScore ?? 0), 0, 100))
    .filter((score) => Number.isFinite(score));

  const examScores = examRows
    .map((row) => clamp(Number(row.diemSo ?? 0), 0, 100))
    .filter((score) => Number.isFinite(score));

  const allScores = [...exerciseScores, ...examScores];
  const averageScore =
    allScores.length > 0
      ? round2(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  const recentAttemptCount =
    exerciseAggregates.reduce((sum, row) => sum + Math.max(0, row.attemptCount), 0)
    + examRows.length;

  return {
    recentAttemptCount,
    averageScore,
  };
}

function buildWeaknessSignature(items: UserWeaknessInput[] | UserWeaknessRow[]): string[] {
  return items
    .slice(0, 6)
    .map((item) => {
      const topic = ("chuDeBaiTap" in item ? item.chuDeBaiTap : null) ?? "";
      return [
        item.khaNang.trim().toLowerCase(),
        topic.trim().toLowerCase(),
        Math.max(1, Math.min(5, Number(item.mucDoUuTien ?? 1))),
      ].join("|");
    })
    .sort();
}

function hasMeaningfulWeaknessChange(previous: UserWeaknessRow[], next: UserWeaknessInput[]): boolean {
  if (previous.length === 0 && next.length === 0) {
    return false;
  }

  if (previous.length === 0 || next.length === 0) {
    return true;
  }

  const previousSignature = buildWeaknessSignature(previous);
  const nextSignature = buildWeaknessSignature(next);

  if (previousSignature.length !== nextSignature.length) {
    return true;
  }

  for (let i = 0; i < previousSignature.length; i += 1) {
    if (previousSignature[i] !== nextSignature[i]) {
      return true;
    }
  }

  const previousTop = previous[0];
  const nextTop = next[0];
  if (!previousTop || !nextTop) {
    return false;
  }

  const previousTopKey = `${previousTop.khaNang}|${previousTop.chuDeBaiTap ?? ""}`.toLowerCase();
  const nextTopKey = `${nextTop.khaNang}|${nextTop.chuDeBaiTap ?? ""}`.toLowerCase();
  return previousTopKey !== nextTopKey;
}

function shouldRegenerateRoadmap(input: {
  forceRoadmapRefresh: boolean;
  activeRoadmapUpdatedAt: Date | null;
  previousWeaknesses: UserWeaknessRow[];
  nextWeaknesses: UserWeaknessInput[];
}): boolean {
  if (input.forceRoadmapRefresh) {
    return true;
  }

  if (!input.activeRoadmapUpdatedAt) {
    return true;
  }

  if (hasMeaningfulWeaknessChange(input.previousWeaknesses, input.nextWeaknesses)) {
    return true;
  }

  const elapsedMs = Date.now() - input.activeRoadmapUpdatedAt.getTime();
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);

  if (elapsedDays >= ROADMAP_FORCE_UPDATE_INTERVAL_DAYS) {
    return true;
  }

  return false;
}

function buildRoadmapPolicyMeta(activeRoadmapUpdatedAt: Date | null) {
  if (!activeRoadmapUpdatedAt) {
    return {
      minUpdateIntervalDays: ROADMAP_MIN_UPDATE_INTERVAL_DAYS,
      forceUpdateIntervalDays: ROADMAP_FORCE_UPDATE_INTERVAL_DAYS,
      lastUpdatedAt: null,
      nextEligibleUpdateAt: null,
      forceRefreshAt: null,
      canAutoRegenerateNow: true,
    };
  }

  const lastUpdatedMs = activeRoadmapUpdatedAt.getTime();
  const nextEligibleMs = lastUpdatedMs + ROADMAP_MIN_UPDATE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const forceRefreshMs = lastUpdatedMs + ROADMAP_FORCE_UPDATE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

  return {
    minUpdateIntervalDays: ROADMAP_MIN_UPDATE_INTERVAL_DAYS,
    forceUpdateIntervalDays: ROADMAP_FORCE_UPDATE_INTERVAL_DAYS,
    lastUpdatedAt: activeRoadmapUpdatedAt.toISOString(),
    nextEligibleUpdateAt: new Date(nextEligibleMs).toISOString(),
    forceRefreshAt: new Date(forceRefreshMs).toISOString(),
    canAutoRegenerateNow: Date.now() >= nextEligibleMs,
  };
}

function estimateWeeklyDuration(level: CefrLevel | null, weaknessCount: number): number {
  const band = toLevelBand(level);
  const base = band === "advanced" ? 3 : band === "intermediate" ? 4 : 5;
  const extra = weaknessCount >= 5 ? 1 : 0;
  return clamp(base + extra, 2, 8);
}

function toFallbackRoadmap(
  weaknesses: UserWeaknessInput[],
  summary: PerformanceSummary,
  currentLevelRaw: string | null,
): LearningRoadmapPayload {
  const currentLevel = normalizeCefrLevel(currentLevelRaw);
  const nextTarget = getLevelTargetLabel(currentLevel);
  const prioritized = weaknesses.slice(0, 3);
  const prioritySkills = prioritized.map((item) => item.khaNang);
  const focusSkills = prioritySkills.length > 0 ? prioritySkills.join(", ") : "General";
  const weeklyDuration = estimateWeeklyDuration(currentLevel, weaknesses.length);

  const objectivePrefix = currentLevel
    ? `Ổn định năng lực ${currentLevel} và từng bước hướng tới ${nextTarget}`
    : "Củng cố nền tảng hiện tại";

  const stage1Activities: RoadmapActivity[] = [
    {
      kyNang: normalizeRoadmapSkill(prioritySkills[0]),
      moTa: "Ôn lại lỗi sai gần đây và làm bài luyện tập ngắn theo điểm yếu chính.",
      tanSuat: "4 buổi/tuần",
      thoiLuongPhut: 25,
    },
    {
      kyNang: "General",
      moTa: "Tổng hợp ghi chú lỗi sai sau mỗi buổi học và tạo checklist tự sửa.",
      tanSuat: "7 ngày/tuần",
      thoiLuongPhut: 10,
    },
  ];

  const stage2Activities: RoadmapActivity[] = [
    {
      kyNang: normalizeRoadmapSkill(prioritySkills[1] ?? prioritySkills[0]),
      moTa: "Làm bộ câu hỏi có thời gian giới hạn để tăng độ chính xác và tốc độ.",
      tanSuat: "3 buổi/tuần",
      thoiLuongPhut: 35,
    },
    {
      kyNang: "General",
      moTa: "Làm một bài kiểm tra tổng hợp mini và rà soát sai sót theo kỹ năng.",
      tanSuat: "2 buổi/tuần",
      thoiLuongPhut: 40,
    },
  ];

  return {
    tenLoTrinh: "Lộ trình cải thiện điểm yếu cá nhân",
    mucTieuTongQuat:
      summary.averageScore < 70
        ? `${objectivePrefix}, nâng điểm trung bình từ ${summary.averageScore}% lên tối thiểu 75% với trọng tâm ${focusSkills}.`
        : `${objectivePrefix}, duy trì độ chính xác trên 85% với trọng tâm ${focusSkills}.`,
    thoiLuongTuan: weeklyDuration,
    giaiDoan: [
      {
        ten: "Giai đoạn 1: Củng cố nền tảng",
        thoiLuongTuan: 2,
        mucTieu: "Giảm lỗi lặp lại ở các kỹ năng yếu chính.",
        hoatDong: stage1Activities,
        chiSoDanhGia: [
          "Tỷ lệ đúng ở bài luyện tập ngắn đạt tối thiểu 75%",
          "Số lỗi lặp lại giảm ít nhất 30% sau 2 tuần",
        ],
      },
      {
        ten: "Giai đoạn 2: Tăng tốc và ổn định",
        thoiLuongTuan: 2,
        mucTieu: "Duy trì độ chính xác ổn định trong điều kiện có thời gian.",
        hoatDong: stage2Activities,
        chiSoDanhGia: [
          "Điểm bài mini test đạt tối thiểu 80%",
          "Hoàn thành bài trong thời gian mục tiêu với sai số thấp",
        ],
      },
    ],
    khuyenNghiHangNgay: [
      "Mỗi ngày dành 10 phút rà soát lỗi sai của buổi gần nhất.",
      "Ưu tiên làm lại các câu đã sai trước khi làm bài mới.",
      "Sau mỗi buổi học, ghi lại 1-2 quy tắc quan trọng cần nhớ.",
    ],
    mocDanhGia: [
      "Cuối tuần 1: kiểm tra mức giảm lỗi sai theo kỹ năng.",
      "Cuối tuần 2: làm mini test tổng hợp để đánh giá tiến bộ.",
      "Cuối tuần 4: đối chiếu điểm trung bình với mục tiêu ban đầu.",
    ],
  };
}

function parseRoadmapFromUnknown(raw: unknown, fallback: LearningRoadmapPayload): LearningRoadmapPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const obj = raw as Record<string, unknown>;
  const giaiDoanRaw = Array.isArray(obj.giaiDoan) ? obj.giaiDoan : [];

  const giaiDoan = giaiDoanRaw
    .map((stage) => {
      if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
        return null;
      }

      const stageObj = stage as Record<string, unknown>;
      const hoatDongRaw = Array.isArray(stageObj.hoatDong) ? stageObj.hoatDong : [];
      const chiSoRaw = Array.isArray(stageObj.chiSoDanhGia) ? stageObj.chiSoDanhGia : [];

      const hoatDong = hoatDongRaw
        .map((activity) => {
          if (!activity || typeof activity !== "object" || Array.isArray(activity)) {
            return null;
          }

          const activityObj = activity as Record<string, unknown>;
          return {
            kyNang: normalizeRoadmapSkill(activityObj.kyNang),
            moTa: toNonEmptyString(activityObj.moTa, "Luyện tập theo trọng tâm điểm yếu."),
            tanSuat: toNonEmptyString(activityObj.tanSuat, "3 buổi/tuần"),
            thoiLuongPhut: clamp(Number(activityObj.thoiLuongPhut ?? 30), 10, 90),
          };
        })
        .filter((activity): activity is RoadmapActivity => activity !== null);

      if (hoatDong.length < 2) {
        return null;
      }

      const chiSoDanhGia = chiSoRaw
        .map((item) => toNonEmptyString(item, "Theo dõi tiến bộ theo điểm và tỷ lệ đúng."))
        .filter((item) => item.length > 0);

      return {
        ten: toNonEmptyString(stageObj.ten, "Giai đoạn học tập"),
        thoiLuongTuan: clamp(Number(stageObj.thoiLuongTuan ?? 2), 1, 8),
        mucTieu: toNonEmptyString(stageObj.mucTieu, "Nâng cao độ chính xác và giảm lỗi sai lặp lại."),
        hoatDong,
        chiSoDanhGia: chiSoDanhGia.length > 0 ? chiSoDanhGia : ["Đạt mục tiêu điểm số theo tuần."],
      };
    })
    .filter((stage): stage is RoadmapStage => stage !== null);

  if (giaiDoan.length < 2) {
    return fallback;
  }

  const khuyenNghi = Array.isArray(obj.khuyenNghiHangNgay)
    ? obj.khuyenNghiHangNgay
      .map((item) => toNonEmptyString(item, "Ôn lại lỗi sai hằng ngày."))
      .filter((item) => item.length > 0)
    : [];

  const mocDanhGia = Array.isArray(obj.mocDanhGia)
    ? obj.mocDanhGia
      .map((item) => toNonEmptyString(item, "Đánh giá lại tiến độ định kỳ."))
      .filter((item) => item.length > 0)
    : [];

  return {
    tenLoTrinh: toNonEmptyString(obj.tenLoTrinh, fallback.tenLoTrinh),
    mucTieuTongQuat: toNonEmptyString(obj.mucTieuTongQuat, fallback.mucTieuTongQuat),
    thoiLuongTuan: clamp(Number(obj.thoiLuongTuan ?? fallback.thoiLuongTuan), 2, 12),
    giaiDoan: giaiDoan.slice(0, 4),
    khuyenNghiHangNgay: khuyenNghi.length > 0 ? khuyenNghi : fallback.khuyenNghiHangNgay,
    mocDanhGia: mocDanhGia.length > 0 ? mocDanhGia : fallback.mocDanhGia,
  };
}

async function generateRoadmapPayload(
  weaknesses: UserWeaknessInput[],
  summary: PerformanceSummary,
  currentLevelRaw: string | null,
): Promise<LearningRoadmapPayload> {
  const currentLevel = normalizeCefrLevel(currentLevelRaw);
  const fallback = toFallbackRoadmap(weaknesses, summary, currentLevel);

  if (!appConfig.db.enabled) {
    return fallback;
  }

  const systemPrompt = loadPromptTemplate(LEARNING_ROADMAP_PROMPT_FILE);
  const userPrompt = JSON.stringify(
    {
      currentLevel,
      currentLevelBand: toLevelBand(currentLevel),
      nextTargetLevel: getLevelTargetLabel(currentLevel),
      userPerformance: {
        recentAttemptCount: summary.recentAttemptCount,
        averageScore: summary.averageScore,
      },
      weaknesses: weaknesses.map((item) => ({
        kieuBaiTap: item.kieuBaiTap,
        chuDeBaiTap: item.chuDeBaiTap ?? null,
        khaNang: item.khaNang,
        moTaDiemYeu: item.moTaDiemYeu,
        mucDoUuTien: item.mucDoUuTien,
        soLanXuatHien: item.soLanXuatHien,
        soLanSai: item.soLanSai,
        diemTrungBinh: item.diemTrungBinh ?? null,
      })),
    },
    null,
    2,
  );

  try {
    const generated = await generateJsonFromProvider<unknown>({
      provider: "openai",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    return parseRoadmapFromUnknown(generated, fallback);
  } catch (error) {
    logger.warn("Learning roadmap AI generation failed, fallback applied", {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

async function refreshForNguoiDungId(
  nguoiDungId: number,
  options: RefreshLearningInsightsOptions,
): Promise<void> {
  const [previousWeaknesses, activeRoadmap, exerciseAggregates, examRows, currentLevel] = await Promise.all([
    learningInsightsRepository.listUserWeaknesses(nguoiDungId, MAX_WEAKNESSES),
    learningInsightsRepository.getActiveRoadmap(nguoiDungId),
    learningInsightsRepository.listExercisePerformanceAggregates(nguoiDungId, 120),
    learningInsightsRepository.listRecentExamCompletions(nguoiDungId, 30),
    learningInsightsRepository.getCurrentUserLevel(nguoiDungId),
  ]);

  const exerciseWeaknesses = exerciseAggregates
    .map((row) => buildWeaknessFromExerciseAggregate(row))
    .filter((item): item is UserWeaknessInput => item !== null);

  const examWeaknesses = buildWeaknessesFromExamRows(
    examRows.map((row) => ({
      ketQuaChamJson: row.ketQuaChamJson,
      diemSo: row.diemSo,
      tongSoCau: row.tongSoCau,
      soCauSai: row.soCauSai,
      ngayTao: row.ngayTao,
    })),
  );

  const mergedWeaknesses = deduplicateWeaknesses([...exerciseWeaknesses, ...examWeaknesses]);

  await learningInsightsRepository.replaceUserWeaknesses(nguoiDungId, mergedWeaknesses);

  const shouldRefreshRoadmap = shouldRegenerateRoadmap({
    forceRoadmapRefresh: Boolean(options.forceRoadmapRefresh),
    activeRoadmapUpdatedAt: activeRoadmap?.ngayCapNhat ?? null,
    previousWeaknesses,
    nextWeaknesses: mergedWeaknesses,
  });

  if (!shouldRefreshRoadmap) {
    return;
  }

  const summary = summarizePerformance(exerciseAggregates, examRows.map((row) => ({ diemSo: row.diemSo })));
  const roadmapPayload = await generateRoadmapPayload(mergedWeaknesses, summary, currentLevel);

  const roadmapTitle = toNonEmptyString(roadmapPayload.tenLoTrinh, "Lộ trình học tập cá nhân").slice(0, 200);
  await learningInsightsRepository.upsertRoadmapForNguoiDungId({
    nguoiDungId,
    tenLoTrinh: roadmapTitle,
    duLieuJson: JSON.stringify(roadmapPayload),
  });
}

export async function refreshLearningInsightsForNguoiDungId(
  nguoiDungId: number,
  options: RefreshLearningInsightsOptions = {},
): Promise<void> {
  if (!appConfig.db.enabled || !Number.isInteger(nguoiDungId) || nguoiDungId <= 0) {
    return;
  }

  const inFlight = inFlightRefreshes.get(nguoiDungId);
  if (inFlight) {
    return inFlight;
  }

  const refreshTask = (async () => {
    try {
      await refreshForNguoiDungId(nguoiDungId, options);
    } finally {
      inFlightRefreshes.delete(nguoiDungId);
    }
  })();

  inFlightRefreshes.set(nguoiDungId, refreshTask);
  return refreshTask;
}

export function triggerLearningInsightsRefresh(input: {
  nguoiDungId: number;
  attemptNumber?: number;
  source?: string;
}): void {
  if (!appConfig.db.enabled || !Number.isInteger(input.nguoiDungId) || input.nguoiDungId <= 0) {
    return;
  }

  if (Number.isInteger(input.attemptNumber) && Number(input.attemptNumber) > 1) {
    return;
  }

  const now = new Date();
  const scheduleKey = toLocalDateKey(now);
  if (scheduledEndOfDayKeys.get(input.nguoiDungId) === scheduleKey) {
    return;
  }

  const existingTimer = scheduledEndOfDayRefreshes.get(input.nguoiDungId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const delayMs = getDelayToEndOfDayMs(now) + 25;
  const timeoutHandle = setTimeout(() => {
    scheduledEndOfDayRefreshes.delete(input.nguoiDungId);
    scheduledEndOfDayKeys.delete(input.nguoiDungId);

    void (async () => {
      try {
        const activeRoadmap = await learningInsightsRepository.getActiveRoadmap(input.nguoiDungId);
        if (activeRoadmap?.ngayCapNhat && isSameLocalDate(activeRoadmap.ngayCapNhat, new Date())) {
          return;
        }

        await refreshLearningInsightsForNguoiDungId(input.nguoiDungId, { forceRoadmapRefresh: true });
      } catch (error: unknown) {
        logger.warn("Learning insights end-of-day refresh failed", {
          nguoiDungId: input.nguoiDungId,
          source: input.source ?? "unknown",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, delayMs);

  if (typeof timeoutHandle.unref === "function") {
    timeoutHandle.unref();
  }

  scheduledEndOfDayRefreshes.set(input.nguoiDungId, timeoutHandle);
  scheduledEndOfDayKeys.set(input.nguoiDungId, scheduleKey);
}

function mapWeaknessRow(row: UserWeaknessRow) {
  const score = Number(row.diemTrungBinh ?? 0);
  let status: "improving" | "stable" | "at_risk" = "at_risk";
  let label = "Cần ưu tiên cải thiện";

  if (score >= 72) {
    status = "improving";
    label = "Đang cải thiện";
  } else if (score >= 60) {
    status = "stable";
    label = "Đang ổn định";
  }

  return {
    kieuBaiTap: row.kieuBaiTap,
    chuDeBaiTap: row.chuDeBaiTap,
    khaNang: row.khaNang,
    moTaDiemYeu: row.moTaDiemYeu,
    mucDoUuTien: row.mucDoUuTien,
    soLanXuatHien: row.soLanXuatHien,
    soLanSai: row.soLanSai,
    diemTrungBinh: row.diemTrungBinh,
    trangThaiTienTrien: status,
    nhanTienTrien: label,
    lanCapNhatCuoi: row.lanCapNhatCuoi.toISOString(),
  };
}

export async function getLearningProfileByTaiKhoanId(
  requestedByTaiKhoanId: number,
): Promise<LearningProfileResult | null> {
  if (!appConfig.db.enabled) {
    return {
      generatedAt: new Date().toISOString(),
      currentLevel: null,
      insightPolicy: {
        firstAttemptOnly: true,
        minAttemptsForWeakness: MIN_ATTEMPTS_FOR_WEAKNESS,
        activeWeaknessThreshold: ACTIVE_WEAKNESS_THRESHOLD,
        resolvedWeaknessThreshold: RESOLVED_WEAKNESS_THRESHOLD,
      },
      roadmapPolicy: {
        minUpdateIntervalDays: ROADMAP_MIN_UPDATE_INTERVAL_DAYS,
        forceUpdateIntervalDays: ROADMAP_FORCE_UPDATE_INTERVAL_DAYS,
        lastUpdatedAt: null,
        nextEligibleUpdateAt: null,
        forceRefreshAt: null,
        canAutoRegenerateNow: true,
      },
      weaknesses: [],
      roadmap: null,
    };
  }

  const nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const [weaknesses, activeRoadmap, currentLevel] = await Promise.all([
    learningInsightsRepository.listUserWeaknesses(nguoiDungId, MAX_WEAKNESSES),
    learningInsightsRepository.getActiveRoadmap(nguoiDungId),
    learningInsightsRepository.getCurrentUserLevel(nguoiDungId),
  ]);

  const parsedRoadmap = parseJson<LearningRoadmapPayload>(activeRoadmap?.duLieuJson);

  return {
    generatedAt: new Date().toISOString(),
    currentLevel,
    insightPolicy: {
      firstAttemptOnly: true,
      minAttemptsForWeakness: MIN_ATTEMPTS_FOR_WEAKNESS,
      activeWeaknessThreshold: ACTIVE_WEAKNESS_THRESHOLD,
      resolvedWeaknessThreshold: RESOLVED_WEAKNESS_THRESHOLD,
    },
    roadmapPolicy: buildRoadmapPolicyMeta(activeRoadmap?.ngayCapNhat ?? null),
    weaknesses: weaknesses.map((row) => mapWeaknessRow(row)),
    roadmap:
      activeRoadmap && parsedRoadmap
        ? {
            tenLoTrinh: activeRoadmap.tenLoTrinh,
            trangThai: activeRoadmap.trangThai,
            ngayTao: activeRoadmap.ngayTao.toISOString(),
            ngayCapNhat: activeRoadmap.ngayCapNhat.toISOString(),
            duLieu: parsedRoadmap,
          }
        : null,
  };
}

export async function refreshLearningProfileByTaiKhoanId(
  requestedByTaiKhoanId: number,
): Promise<LearningProfileResult | null> {
  if (!appConfig.db.enabled) {
    return {
      generatedAt: new Date().toISOString(),
      currentLevel: null,
      insightPolicy: {
        firstAttemptOnly: true,
        minAttemptsForWeakness: MIN_ATTEMPTS_FOR_WEAKNESS,
        activeWeaknessThreshold: ACTIVE_WEAKNESS_THRESHOLD,
        resolvedWeaknessThreshold: RESOLVED_WEAKNESS_THRESHOLD,
      },
      roadmapPolicy: {
        minUpdateIntervalDays: ROADMAP_MIN_UPDATE_INTERVAL_DAYS,
        forceUpdateIntervalDays: ROADMAP_FORCE_UPDATE_INTERVAL_DAYS,
        lastUpdatedAt: null,
        nextEligibleUpdateAt: null,
        forceRefreshAt: null,
        canAutoRegenerateNow: true,
      },
      weaknesses: [],
      roadmap: null,
    };
  }

  const nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  await refreshLearningInsightsForNguoiDungId(nguoiDungId, { forceRoadmapRefresh: true });
  return getLearningProfileByTaiKhoanId(requestedByTaiKhoanId);
}
