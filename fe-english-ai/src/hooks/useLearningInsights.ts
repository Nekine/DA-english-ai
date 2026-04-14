import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { learningInsightsService } from "@/services/learningInsightsService";

export const LEARNING_INSIGHTS_QUERY_KEYS = {
  profile: ["learning-insights", "profile"] as const,
};

export function useLearningInsightsProfile(enabled: boolean) {
  return useQuery({
    queryKey: LEARNING_INSIGHTS_QUERY_KEYS.profile,
    queryFn: () => learningInsightsService.getProfile(),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useRefreshLearningInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => learningInsightsService.refreshProfile(),
    onSuccess: (profile) => {
      queryClient.setQueryData(LEARNING_INSIGHTS_QUERY_KEYS.profile, profile);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LEARNING_INSIGHTS_QUERY_KEYS.profile });
    },
  });
}
