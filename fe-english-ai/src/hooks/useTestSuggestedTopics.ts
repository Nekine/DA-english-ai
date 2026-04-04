import { useQuery } from "@tanstack/react-query";
import { testExamService } from "@/services/testExamService";

export const useTestSuggestedTopics = () => {
  return useQuery({
    queryKey: ["test-exam-suggested-topics"],
    queryFn: () => testExamService.getSuggestedTopics(),
  });
};
