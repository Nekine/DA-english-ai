import { useToast } from '@/hooks/use-toast';
import { Activity, statsService } from '@/services/statsService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys for caching
export const STATS_QUERY_KEYS = {
  userStats: (userId: number) => ['stats', 'user', userId],
  activities: (userId: number, limit?: number) => ['stats', 'activities', userId, limit],
  weeklyProgress: (userId: number) => ['stats', 'weekly', userId],
  achievements: (userId: number) => ['stats', 'achievements', userId],
  leaderboard: (limit?: number, skill?: string) => ['stats', 'leaderboard', limit, skill],
  progressHistory: (userId: number, period?: string) => ['stats', 'progress-history', userId, period],
  searchLeaderboard: (query: string) => ['stats', 'search', query],
};

// Hook for user statistics
export const useUserStats = (userId: number) => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.userStats(userId),
    queryFn: () => statsService.getUserStats(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for recent activities
export const useRecentActivities = (userId: number, limit: number = 10) => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.activities(userId, limit),
    queryFn: () => statsService.getRecentActivities(userId, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for weekly progress
export const useWeeklyProgress = (userId: number) => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.weeklyProgress(userId),
    queryFn: () => statsService.getWeeklyProgress(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for achievements
export const useAchievements = (userId: number) => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.achievements(userId),
    queryFn: () => statsService.getAchievements(userId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for leaderboard with time filtering
export const useLeaderboard = (limit: number = 50, skillType?: string, timeFilter?: string) => {
  return useQuery({
    queryKey: [...STATS_QUERY_KEYS.leaderboard(limit, skillType), timeFilter],
    queryFn: () => statsService.getLeaderboard(limit, skillType, timeFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for progress history (charts)
export const useProgressHistory = (userId: number, period: string = 'week') => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.progressHistory(userId, period),
    queryFn: () => statsService.getProgressHistory(userId, period),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for searching leaderboard
export const useSearchLeaderboard = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.searchLeaderboard(query),
    queryFn: () => statsService.searchLeaderboard(query),
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for updating progress (mutation)
export const useUpdateProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, activityData }: { userId: number; activityData: Omit<Activity, 'id'> }) =>
      statsService.updateProgress(userId, activityData),
    onSuccess: (_, { userId }) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEYS.userStats(userId) });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEYS.activities(userId) });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEYS.weeklyProgress(userId) });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEYS.progressHistory(userId) });
      
      toast({
        title: 'Progress Updated',
        description: 'Your learning progress has been recorded successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Failed to update progress:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your progress. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Composite hook for dashboard data
export const useDashboardData = (userId: number) => {
  const userStats = useUserStats(userId);
  const recentActivities = useRecentActivities(userId, 5);
  const weeklyProgress = useWeeklyProgress(userId);
  const achievements = useAchievements(userId);

  return {
    userStats,
    recentActivities,
    weeklyProgress,
    achievements,
    isLoading: userStats.isLoading || recentActivities.isLoading || weeklyProgress.isLoading || achievements.isLoading,
    isError: userStats.isError || recentActivities.isError || weeklyProgress.isError || achievements.isError,
    refetchAll: () => {
      userStats.refetch();
      recentActivities.refetch();
      weeklyProgress.refetch();
      achievements.refetch();
    }
  };
};

// Composite hook for leaderboard page
export const useLeaderboardData = (limit: number = 50, skillType?: string) => {
  const leaderboard = useLeaderboard(limit, skillType);
  
  return {
    leaderboard,
    isLoading: leaderboard.isLoading,
    isError: leaderboard.isError,
    refetch: leaderboard.refetch,
  };
};

export default {
  useUserStats,
  useRecentActivities,
  useWeeklyProgress,
  useAchievements,
  useLeaderboard,
  useProgressHistory,
  useSearchLeaderboard,
  useUpdateProgress,
  useDashboardData,
  useLeaderboardData,
};