import { useQuery } from "@tanstack/react-query";

export interface TestQuestion {
  questionId: number;
  questionNumber: number;
  questionText: string | null;
  questionType: string;
  audioUrl: string | null;
  imageUrl: string | null;
  correctAnswerLabel: string;
  answerExplanation: string;
  options: string[];
}

export interface TestDetail {
  testId: string;
  title: string;
  questions: TestQuestion[];
}

export const useTestDetail = (testId: string | null) => {
  return useQuery({
    queryKey: ["test-detail", testId],
    queryFn: async () => {
      if (!testId) throw new Error("Test ID is required");
      const response = await fetch(`https://luyende.onrender.com/api/Home/${testId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch test detail");
      }
      return response.json() as Promise<TestDetail>;
    },
    enabled: !!testId,
  });
};
