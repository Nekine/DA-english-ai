// 🔄 ADMIN UPLOAD SERVICE - Kết nối Admin Upload với Reading Exercises
// ✅ Sync admin uploaded files với Reading Exercises page
// 🎯 Features: File upload handling, exercise creation from uploaded content

import { Question, ReadingExercise } from './databaseStatsService';

interface BackendQuestion {
  Id?: number;
  QuestionText?: string;
  questionText?: string; // Support both camelCase and PascalCase
  question?: string;
  Options?: string[];
  options?: string[];
  correctAnswer?: number;
  Explanation?: string;
  explanation?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  date: string;
  status: 'uploaded' | 'processing' | 'error' | 'local';
  type: 'reading-passages' | 'reading-questions' | 'audio' | 'document';
  content?: string; // For text-based files
  exercises?: ReadingExercise[]; // Parsed exercises from the file
}

export interface AdminUploadedExercise {
  id: number;
  name: string;
  content: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'Part 5' | 'Part 6' | 'Part 7';
  sourceType: 'manual';
  questions: Question[];
  uploadedBy: string;
  originalFileName: string;
  createdAt: string;
  updatedAt: string;
}

class AdminUploadService {
  private readonly STORAGE_KEY = 'admin_uploaded_exercises';
  private readonly FILES_KEY = 'admin_uploaded_files';

  // Lưu file upload từ admin
  saveUploadedFile(file: UploadedFile): void {
    const files = this.getUploadedFiles();
    const existingIndex = files.findIndex(f => f.id === file.id);
    
    if (existingIndex >= 0) {
      files[existingIndex] = file;
    } else {
      files.push(file);
    }
    
    localStorage.setItem(this.FILES_KEY, JSON.stringify(files));
  }

  // Lấy tất cả files đã upload
  getUploadedFiles(): UploadedFile[] {
    const stored = localStorage.getItem(this.FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Tạo Reading Exercise từ uploaded content - GỬI VỀ API BACKEND (chỉ dùng API, không dùng localStorage)
  async createExerciseFromUpload(
    fileName: string,
    content: string,
    level: 'Beginner' | 'Intermediate' | 'Advanced',
    type: 'Part 5' | 'Part 6' | 'Part 7',
    uploadedBy: string = 'Admin'
  ): Promise<ReadingExercise> {
    try {
      // Gọi API tạo exercise passage (step 1)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5283';
      const createResponse = await fetch(`${apiBaseUrl}/api/ReadingExercise/create-passage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: this.generateExerciseName(fileName, type),
          content,
          partType: type,
          level,
          createdBy: uploadedBy
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ message: 'Failed to create exercise' }));
        throw new Error(errorData.message || `API error: ${createResponse.status}`);
      }

      const exerciseData = await createResponse.json();
      const exerciseId = exerciseData.exerciseId || exerciseData.id;
      
      // Generate questions using AI (optional - can be done manually via add-questions endpoint)
      // For now, return the exercise without questions (admin can add questions later)
      return {
        id: exerciseId,
        exerciseId: exerciseId,
        name: exerciseData.name || exerciseData.title,
        content: exerciseData.content,
        level: exerciseData.level,
        type: exerciseData.type,
        sourceType: 'manual',
        questions: [], // Questions will be added via add-questions endpoint
        createdAt: exerciseData.createdAt || new Date().toISOString(),
        updatedAt: exerciseData.createdAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating exercise via API:', error);
      throw error; // Throw error instead of falling back to localStorage
    }
  }

  // Lấy tất cả exercises từ admin (deprecated - chỉ dùng để tương thích, không còn dùng localStorage)
  getAdminExercises(): ReadingExercise[] {
    // Không còn dùng localStorage - trả về mảng rỗng
    return [];
  }

  // Xóa exercise (deprecated - không còn dùng localStorage)
  deleteExercise(exerciseId: number): boolean {
    // Không còn dùng localStorage - return false
    return false;
  }

  // Parse nội dung thành questions (simplified version)
  private parseContentToQuestions(content: string, type: 'Part 5' | 'Part 6' | 'Part 7'): Question[] {
    // Đây là parser đơn giản - trong thực tế sẽ phức tạp hơn
    const questions: Question[] = [];
    
    if (type === 'Part 5') {
      // Parse grammar questions
      const lines = content.split('\n').filter(line => line.trim());
      let currentQuestion: Partial<Question> = {};
      
      lines.forEach((line, index) => {
        if (line.match(/^\d+\./)) {
          // New question
          if (currentQuestion.question && currentQuestion.options) {
            questions.push(currentQuestion as Question);
          }
          currentQuestion = {
            question: line.replace(/^\d+\.\s*/, ''),
            options: [],
            correctAnswer: 0,
            explanation: 'Admin uploaded question'
          };
        } else if (line.match(/^[A-D]\)/)) {
          // Option
          if (currentQuestion.options) {
            currentQuestion.options.push(line.replace(/^[A-D]\)\s*/, ''));
          }
        } else if (line.toLowerCase().includes('answer:')) {
          // Answer
          const answerMatch = line.match(/answer:\s*([A-D])/i);
          if (answerMatch && currentQuestion) {
            currentQuestion.correctAnswer = answerMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
          }
        }
      });
      
      // Add last question
      if (currentQuestion.question && currentQuestion.options) {
        questions.push(currentQuestion as Question);
      }
    } else {
      // For Part 6 and 7, create sample questions
      for (let i = 1; i <= (type === 'Part 6' ? 4 : 8); i++) {
        questions.push({
          question: `Question ${i} based on the uploaded content.`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This question was generated from uploaded content.'
        });
      }
    }
    
    return questions.length > 0 ? questions : [{
      question: 'Sample question from uploaded content.',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'Generated from uploaded file.'
    }];
  }

  // Generate tên exercise từ filename
  private generateExerciseName(fileName: string, type: string): string {
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${type}: ${baseName} (Admin Upload)`;
  }

  // Tích hợp với Reading Exercises (deprecated - không còn dùng localStorage)
  getAllReadingExercises(): ReadingExercise[] {
    // Không còn dùng localStorage - trả về mảng rỗng
    // Tất cả exercises sẽ được lấy từ API backend
    return [];
  }

  // Import exercise từ JSON/CSV format
  async importExerciseFromJSON(jsonContent: string): Promise<ReadingExercise[]> {
    try {
      const data = JSON.parse(jsonContent);
      const exercises: ReadingExercise[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.name && item.content && item.questions) {
            const exercise = await this.createExerciseFromUpload(
              item.name || `Imported Exercise ${data.indexOf(item) + 1}`,
              item.content,
              item.level || 'Intermediate',
              item.type || 'Part 7',
              'Admin Import'
            );
            exercises.push(exercise);
          }
        }
      }
      
      return exercises;
    } catch (error) {
      console.error('Error importing exercise from JSON:', error);
      return [];
    }
  }

  // Clear all admin data (for testing)
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.FILES_KEY);
  }

  // Get statistics
  getUploadStats() {
    const exercises = this.getAdminExercises();
    const files = this.getUploadedFiles();
    
    return {
      totalExercises: exercises.length,
      totalFiles: files.length,
      byLevel: {
        Beginner: exercises.filter(e => e.level === 'Beginner').length,
        Intermediate: exercises.filter(e => e.level === 'Intermediate').length,
        Advanced: exercises.filter(e => e.level === 'Advanced').length,
      },
      byType: {
        'Part 5': exercises.filter(e => e.type === 'Part 5').length,
        'Part 6': exercises.filter(e => e.type === 'Part 6').length,
        'Part 7': exercises.filter(e => e.type === 'Part 7').length,
      },
      recentUploads: exercises.slice(-5).map(e => ({
        name: e.name,
        createdAt: e.createdAt
      }))
    };
  }
}

export const adminUploadService = new AdminUploadService();