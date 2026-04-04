import { useMutation, useQueryClient } from "@tanstack/react-query";
import { testExamService, type CreateTestExamPayload, type TestExamSummary } from "@/services/testExamService";

export const useCreateTestExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTestExamPayload): Promise<TestExamSummary> => {
      return testExamService.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["test-exam-list"] });
    },
  });
};
