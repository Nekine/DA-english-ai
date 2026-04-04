import { useQuery } from "@tanstack/react-query";
import { testExamService, type TestExamSummary } from "@/services/testExamService";

export const useTestList = () => {
  return useQuery({
    queryKey: ["test-exam-list"],
    queryFn: (): Promise<TestExamSummary[]> => testExamService.getList(),
  });
};
