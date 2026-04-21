import { apiService } from '@/services/api';

// Map frontend levels to backend enum values
// Basic (A1-A2) -> Elementary (2)
// Intermediate (B1-B2) -> UpperIntermediate (4)
// Advanced (C1-C2) -> Proficient (6)
const levelMapping: Record<string, number> = {
  "Basic": 2,       // A1-A2 -> Elementary
  "Intermediate": 4, // B1-B2 -> UpperIntermediate
  "Advanced": 6,     // C1-C2 -> Proficient
};

export interface GenerateReviewRequest {
  userLevel: string;
  requirement: string;
  content: string;
}

type AiProvider = 'gemini' | 'openai' | 'xai';

export const reviewApi = {
  generateReview: async (data: GenerateReviewRequest, provider: AiProvider = 'openai'): Promise<string> => {
    try {
      console.log("🚀 Calling Review API with data:", {
        userLevel: data.userLevel,
        mappedLevel: levelMapping[data.userLevel],
        requirementLength: data.requirement.length,
        contentLength: data.content.length,
        provider: provider,
      });

      // Chuẩn bị request body giống backend mong đợi
      const requestBody = {
        UserLevel: levelMapping[data.userLevel] || 2, // Map to backend enum
        Requirement: data.requirement,
        Content: data.content,
      };

      console.log("📤 Request body:", requestBody);

      // Sử dụng fetch giống như Chat page
      const response = await fetch(`${apiService.getBaseUrl()}/api/Review/Generate?provider=${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Lấy response text
      const result = await response.text();
      
      console.log("✅ Response received, length:", result.length);
      console.log("📝 Response preview:", result.substring(0, 200));

      // Kiểm tra nếu response chứa message lỗi "busy"
      if (result.includes("CẢNH BÁO") || result.includes("DALTK đang bận")) {
        console.log("⚠️ Backend is busy");
        const busyError = new Error(result) as Error & { isBusyError: boolean };
        busyError.isBusyError = true;
        throw busyError;
      }

      return result;
    } catch (error: unknown) {
      console.error("❌ API Error:", error);
      
      // Re-throw busy error
      if (error instanceof Error && 'isBusyError' in error && (error as { isBusyError: boolean }).isBusyError) {
        throw error;
      }
      
      throw new Error("Không thể kết nối đến server. Vui lòng kiểm tra backend.");
    }
  },
};

// Map level for sentence writing (same as review)
const sentenceLevelMapping: Record<string, number> = {
  "Basic": 2,        // A1-A2 -> Elementary
  "Intermediate": 3, // B1-B2 -> Intermediate
  "Advanced": 5      // C1-C2 -> Advanced
};

export interface GenerateSentencesRequest {
  topic: string;
  level: string;
  sentenceCount: number;
  writingStyle?: string;
}

export interface GenerateSentencesResponse {
  Sentences: Array<{
    Id: number;
    Vietnamese: string;
    CorrectAnswer: string;
    Suggestion?: {
      Vocabulary: Array<{ Word: string; Meaning: string }>;
      Structure: string;
    };
  }>;
}

export interface SubmitSentenceWritingResultRequest {
  exerciseId: number;
  answers: Array<{
    sentenceId?: number;
    userTranslation: string;
  }>;
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds?: number;
}

export interface SubmitSentenceWritingResultResponse {
  success: boolean;
  message: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  reviews: Array<{
    sentenceId: number;
    vietnamese: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    score: number;
  }>;
}

export interface SentenceWritingHistoryItem {
  exerciseId: number;
  kind: 'writing';
  title: string;
  topic: string;
  level: string;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceWritingHistoryDetail {
  kind: 'writing';
  exerciseId: number;
  title: string;
  topic: string;
  level: string;
  sentences: Array<{
    id: number;
    vietnamese: string;
    correctAnswer: string;
    suggestion?: {
      vocabulary?: Array<{ word: string; meaning: string }>;
      structure?: string;
    };
  }>;
}

export const sentenceWritingApi = {
  generateSentences: async (data: GenerateSentencesRequest, provider: AiProvider = 'openai'): Promise<GenerateSentencesResponse> => {
    try {
      const requestBody = {
        Topic: data.topic,
        Level: sentenceLevelMapping[data.level] || 3,
        SentenceCount: data.sentenceCount,
        WritingStyle: data.writingStyle || "Communicative",
      };
      
      const url = `${apiService.getBaseUrl()}/api/SentenceWriting/Generate?provider=${provider}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limit (429)
        if (response.status === 429) {
          throw new Error("🕐 API đang bận hoặc hết quota. Vui lòng đợi 1-2 phút và thử lại. Nếu vẫn lỗi, hãy kiểm tra Gemini API key.");
        }
        
        throw new Error(errorText || `Server responded with status: ${response.status}`);
      }

      const result = await response.json();

      // Kiểm tra nếu backend busy
      if (typeof result === 'string' && (result.includes("CẢNH BÁO") || result.includes("DALTK đang bận"))) {
        const busyError = new Error(result) as Error & { isBusyError: boolean };
        busyError.isBusyError = true;
        throw busyError;
      }

      return result;
    } catch (error: unknown) {
      console.error("❌ API Error:", error);
      console.error("❌ Error type:", error instanceof Error ? 'Error' : typeof error);
      
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      
      // Re-throw busy error
      if (error instanceof Error && 'isBusyError' in error && (error as { isBusyError: boolean }).isBusyError) {
        throw error;
      }
      
      // Check if it's a network error
      if (error instanceof TypeError) {
        console.error("❌ Network error detected");
        throw new Error("Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Backend đã chạy chưa?\n2. FE proxy có trỏ đúng BE chưa? (mặc định http://localhost:3000)\n3. CORS/proxy có được config chưa?");
      }
      
      // Re-throw other errors with their original message
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("Không thể kết nối đến server. Vui lòng kiểm tra backend.");
    }
  },

  saveSentenceWriting: async (data: {
    title: string;
    topic: string;
    sentences: Array<{
      id: number;
      vietnamese: string;
      correctAnswer: string;
      suggestion?: {
        vocabulary: Array<{ word: string; meaning: string }>;
        structure: string;
      };
    }>;
    level?: string;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
    createdBy?: number;
  }): Promise<{ success: boolean; exerciseId?: number; message: string }> => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/exercise/save-sentence-writing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to save sentence writing: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error saving sentence writing:', error);
      throw error;
    }
  },

  submitSentenceWritingResult: async (
    data: SubmitSentenceWritingResultRequest,
  ): Promise<SubmitSentenceWritingResultResponse> => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/exercise/submit-sentence-writing-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit sentence writing result: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error submitting sentence writing result:', error);
      throw error;
    }
  },

  getCreatedExercises: async (take: number = 20): Promise<SentenceWritingHistoryItem[]> => {
    const query = new URLSearchParams({ kind: 'writing', take: String(take) }).toString();
    const response = await apiService.get<{ success: boolean; items: SentenceWritingHistoryItem[] }>(`/api/exercise/created?${query}`);
    return Array.isArray(response.items) ? response.items : [];
  },

  getCreatedExerciseDetail: async (exerciseId: number): Promise<SentenceWritingHistoryDetail> => {
    const response = await apiService.get<{ success: boolean; data: SentenceWritingHistoryDetail }>(`/api/exercise/created/${exerciseId}?kind=writing`);
    if (!response?.data) {
      throw new Error('Không tìm thấy dữ liệu bài luyện viết');
    }

    return response.data;
  }
};

export interface SaveWritingExerciseRequest {
  title: string;
  content?: string;
  requirement: string;
  level?: string;
  category?: string;
  estimatedMinutes: number;
  timeLimit: number;
  description?: string;
  createdBy: number;
}

export const writingApi = {
  saveWritingExercise: async (data: SaveWritingExerciseRequest): Promise<{ success: boolean; exerciseId?: number; message: string }> => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/Review/SaveWritingExercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to save writing exercise: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error saving writing exercise:', error);
      throw error;
    }
  }
};
