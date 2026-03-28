import { useToast } from '@/hooks/use-toast';
import {
  databaseStatsService,
  type ReadingExercise,
  type UserResult
} from '@/services/databaseStatsService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useReadingExercises = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. LẤY BÀI TẬP TỪ .NET API (chỉ dùng API backend, không dùng localStorage)
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['reading-exercises-main'],
    queryFn: async () => {
      try {
        // Chỉ lấy từ API backend
        const apiExercises = await databaseStatsService.getReadingExercises();
        return apiExercises;
      } catch (error) {
        // Fallback to empty array if API fails (không dùng localStorage nữa)
        console.warn('API failed, returning empty array:', error);
        return [];
      }
    },
    // Refetch khi cần để lấy dữ liệu mới nhất
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 🤖 MUTATION TẠO BÀI BẰNG AI: Tạo bài tập với Gemini AI qua .NET API
  // Luồng: Frontend -> databaseStatsService.generateReadingExercise() -> Backend API -> Gemini Service -> Database
  // Input: {topic, level, type} -> Output: ReadingExercise với questions JSON từ AI
  const generateMutation = useMutation({
    mutationFn: ({
      topic,
      level,
      type,
      provider = 'openai'
    }: {
      topic: string;
      level: 'Beginner' | 'Intermediate' | 'Advanced';
      type: 'Part 5' | 'Part 6' | 'Part 7';
      provider?: 'gemini' | 'openai' | 'xai';
    }) => databaseStatsService.generateReadingExercise(topic, level, type, provider),
    onSuccess: (newExercise: ReadingExercise) => {
      // THÊM VÀO DANH SÁCH
      queryClient.setQueryData<ReadingExercise[]>(['reading-exercises-main'], (old) => 
        old ? [...old, newExercise] : [newExercise]
      );
      toast({
        title: 'AI Exercise Generated!',
        description: `New ${newExercise.type} exercise "${newExercise.name}" created by Gemini AI.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'AI Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate exercise with AI',
        variant: 'destructive',
      });
    },
  });

  // 3. SUBMIT KẾT QUẢ VÀO .NET API
  const submitMutation = useMutation({
    mutationFn: ({ exerciseId, answers }: { exerciseId: number; answers: number[] }) =>
      databaseStatsService.submitReadingResult(1, exerciseId, answers), // userId=1 tạm
    onSuccess: (result: UserResult) => {
      toast({
        title: 'Results Saved',
        description: `Score: ${result.score}/${result.totalQuestions} - Great job!`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Submit Failed',
        description: error instanceof Error ? error.message : 'Failed to save results',
        variant: 'destructive',
      });
    },
  });

  // 4. CALLBACK SUBMIT
  const submitResult = useCallback((
    exerciseId: number, 
    answers: number[]
  ) => {
    submitMutation.mutate({ exerciseId, answers });
  }, [submitMutation]);

  // 5. REFRESH DATA - Force refetch when admin uploads new exercise
  const refreshExercises = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reading-exercises-main'] });
  }, [queryClient]);

  return {
    exercises,
    isLoading,
    generateExercise: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    submitResult,
    refreshExercises, // Expose refresh function for admin components
  };
};