// 📊 ADMIN PROGRESS HOOK - Clean admin dashboard hooks
// ✅ USES: adminService.ts and userManagementService.ts only
// 🎯 FOCUS: Reading exercises admin functionality

import { useToast } from '@/hooks/use-toast';
import { adminService, AdminUser, CreateUserRequest, UpdateUserRequest } from '@/services/adminService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys
export const ADMIN_QUERY_KEYS = {
  DASHBOARD: ['admin', 'dashboard'],
  USERS: ['admin', 'users'],
  USER_STATS: ['admin', 'user-stats'],
  LEADERBOARD: ['admin', 'leaderboard'],
  SYSTEM_HEALTH: ['admin', 'system-health'],
} as const;

// 📊 Dashboard Data Hook
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.DASHBOARD,
    queryFn: () => adminService.getDashboardData(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
};

// 👥 Users Management Hooks
export const useAdminUsers = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.USERS,
    queryFn: () => adminService.getUsers(),
    staleTime: 60 * 1000, // 1 minute
  });
};

// 📈 User Statistics Hook
export const useAdminUserStats = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.USER_STATS,
    queryFn: () => adminService.getSystemStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// 🏆 Leaderboard Hook
export const useAdminLeaderboard = (timeFilter: 'all' | 'today' | 'week' | 'month' = 'week') => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.LEADERBOARD, timeFilter],
    queryFn: async () => {
      const result = await adminService.getLeaderboard(timeFilter);
      // Convert LeaderboardUser to format expected by Leaderboard.tsx (Reading-only focus)
      return result.users.map(user => ({
        rank: user.rank,
        username: user.name, // map name -> username
        totalScore: user.totalXp, // map totalXp -> totalScore 
        listening: 0, // Reading-only focus
        speaking: 0,
        reading: user.averageScore, // Reading score
        writing: 0,
        exams: user.completedExercises, // map completedExercises -> exams
        lastUpdate: new Date().toISOString() // Mock lastUpdate
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// 🔧 System Health Hook
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.SYSTEM_HEALTH,
    queryFn: () => adminService.getSystemHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
};

// 👤 Create User Mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userData: CreateUserRequest) => adminService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.DASHBOARD });
      toast({
        title: "Success",
        description: "User created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive",
      });
      console.error('Create user error:', error);
    },
  });
};

// ✏️ Update User Mutation
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserRequest }) => 
      adminService.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.DASHBOARD });
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
      console.error('Update user error:', error);
    },
  });
};

// 🗑️ Delete User Mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.DASHBOARD });
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
      console.error('Delete user error:', error);
    },
  });
};

// 📊 Export Excel Hook
export const useExportToExcel = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => adminService.exportUsersToExcel(),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data exported to Excel successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to export data.",
        variant: "destructive",
      });
      console.error('Export error:', error);
    },
  });
};

// 📥 Import Excel Hook
export const useImportUsersFromExcel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => adminService.importUsersFromExcel(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.DASHBOARD });
      toast({
        title: "Success",
        description: "Users imported from Excel successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to import users from Excel.",
        variant: "destructive",
      });
      console.error('Import error:', error);
    },
  });
};

// 🔄 Update User Progress Hook
export const useUpdateUserProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserRequest }) => 
      adminService.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      toast({
        title: "Success",
        description: "User progress updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update user progress.",
        variant: "destructive",
      });
      console.error('Update progress error:', error);
    },
  });
};

// 👤 Current User Progress Hook (for Progress.tsx)
export const useCurrentUserProgress = () => {
  return useQuery({
    queryKey: ['currentUser', 'progress'],
    queryFn: async () => {
      // Mock current user data - should be replaced with actual user API call
      const mockCurrentUser: AdminUser = {
        id: 'current-user',
        userId: 'current-user',
        username: 'currentuser',
        fullName: 'Current User',
        email: 'user@example.com',
        level: 3,
        totalXp: 2500,
        joinedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString(),
        status: 'Active',
        exercisesCompleted: 25,
        averageScore: 78,
        streakDays: 7,
        achievements: ['First Reading', 'Week Streak', 'High Score']
      };
      return mockCurrentUser;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// 🏆 Add Achievement Hook
export const useAddAchievement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, achievement }: { userId: string; achievement: string }) => {
      // Mock achievement functionality since not in adminService
      console.log('Adding achievement:', achievement, 'to user:', userId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      toast({
        title: "Success",
        description: "Achievement added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add achievement.",
        variant: "destructive",
      });
      console.error('Add achievement error:', error);
    },
  });
};