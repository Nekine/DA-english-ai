// 🎣 DATABASE STATS HOOKS - React Query hooks cho .NET API integration
// ✅ READY FOR GIT: Hoàn thành caching strategy với TanStack Query
// 🔄 TODO OPTIMIZE: Thêm optimistic updates khi có real backend
// 🚀 Features: Smart caching, error boundaries, stale-while-revalidate
// ⚡ Performance: 5-minute cache, auto retry, background refetch

import { useQuery } from '@tanstack/react-query';
import { databaseStatsService, TimeFilter } from '../services/databaseStatsService';

// Query keys for caching - IMPORTANT: Thay đổi keys khi thay đổi API structure
export const DATABASE_STATS_QUERY_KEYS = {
  userStats: (userId: string) => ['database-stats', 'user', userId],
  leaderboard: (timeFilter: TimeFilter) => ['database-stats', 'leaderboard', timeFilter],
  progressData: (userId: string) => ['database-stats', 'progress', userId],
  readingExercises: () => ['database-stats', 'reading-exercises'],
};

// Hook để lấy user stats từ database
export const useDatabaseUserStats = (userId: string = 'current-user') => {
  return useQuery({
    queryKey: DATABASE_STATS_QUERY_KEYS.userStats(userId),
    queryFn: () => databaseStatsService.getUserStats(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook để lấy leaderboard data từ database
export const useDatabaseLeaderboard = (timeFilter: TimeFilter = 'all', limit: number = 50) => {
  return useQuery({
    queryKey: DATABASE_STATS_QUERY_KEYS.leaderboard(timeFilter),
    queryFn: () => databaseStatsService.getLeaderboard(timeFilter, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook để lấy progress data từ database
export const useDatabaseProgressData = (userId: string = 'current-user') => {
  return useQuery({
    queryKey: DATABASE_STATS_QUERY_KEYS.progressData(userId),
    queryFn: () => databaseStatsService.getProgressData(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook để lấy reading exercises từ database
export const useDatabaseReadingExercises = () => {
  return useQuery({
    queryKey: DATABASE_STATS_QUERY_KEYS.readingExercises(),
    queryFn: () => databaseStatsService.getReadingExercises(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Composite hook cho Progress page
export const useDatabaseDashboardData = (userId: string = 'current-user') => {
  const userStats = useDatabaseUserStats(userId);
  const progressData = useDatabaseProgressData(userId);

  return {
    userStats,
    progressData,
    isLoading: userStats.isLoading || progressData.isLoading,
    isError: userStats.isError || progressData.isError,
    refetchAll: () => {
      userStats.refetch();
      progressData.refetch();
    }
  };
};

// Composite hook cho Leaderboard page
export const useDatabaseLeaderboardData = (timeFilter: TimeFilter = 'all', limit: number = 50) => {
  const leaderboard = useDatabaseLeaderboard(timeFilter, limit);
  
  return {
    leaderboard,
    isLoading: leaderboard.isLoading,
    isError: leaderboard.isError,
    refetch: leaderboard.refetch,
  };
};

// Composite hook cho Reading Exercises page
export const useDatabaseReadingExercisesData = () => {
  const readingExercises = useDatabaseReadingExercises();
  
  return {
    readingExercises,
    isLoading: readingExercises.isLoading,
    isError: readingExercises.isError,
    refetch: readingExercises.refetch,
  };
};

export default {
  useDatabaseUserStats,
  useDatabaseLeaderboard,
  useDatabaseProgressData,
  useDatabaseReadingExercises,
  useDatabaseDashboardData,
  useDatabaseLeaderboardData,
  useDatabaseReadingExercisesData,
};