import { useQuery } from "@tanstack/react-query";
import { testExamService, type TestExamDetail } from "@/services/testExamService";

export const useTestDetail = (testId: string | null) => {
  return useQuery({
    queryKey: ["test-exam-detail", testId],
    queryFn: async (): Promise<TestExamDetail> => {
      if (!testId) throw new Error("Test ID is required");
      return testExamService.getDetail(testId);
    },
    enabled: !!testId,
    refetchInterval: (query) => {
      const detail = query.state.data as TestExamDetail | undefined;
      return detail?.status === "generating" ? 2500 : false;
    },
  });
};
