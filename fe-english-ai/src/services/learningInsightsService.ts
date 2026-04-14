import { apiService } from "./api";

export type RoadmapActivity = {
  kyNang: string;
  moTa: string;
  tanSuat: string;
  thoiLuongPhut: number;
};

export type RoadmapStage = {
  ten: string;
  thoiLuongTuan: number;
  mucTieu: string;
  hoatDong: RoadmapActivity[];
  chiSoDanhGia: string[];
};

export type LearningRoadmapPayload = {
  tenLoTrinh: string;
  mucTieuTongQuat: string;
  thoiLuongTuan: number;
  giaiDoan: RoadmapStage[];
  khuyenNghiHangNgay: string[];
  mocDanhGia: string[];
};

export type LearningWeakness = {
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
};

export type LearningProfile = {
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
  weaknesses: LearningWeakness[];
  roadmap: {
    tenLoTrinh: string;
    trangThai: string;
    ngayTao: string;
    ngayCapNhat: string;
    duLieu: LearningRoadmapPayload;
  } | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

class LearningInsightsService {
  async getProfile(): Promise<LearningProfile> {
    const response = await apiService.get<ApiEnvelope<LearningProfile>>("/api/learning-insights/profile");
    return response.data;
  }

  async refreshProfile(): Promise<LearningProfile> {
    const response = await apiService.post<ApiEnvelope<LearningProfile>, Record<string, never>>(
      "/api/learning-insights/refresh",
      {},
    );
    return response.data;
  }
}

export const learningInsightsService = new LearningInsightsService();
