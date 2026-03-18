import { useQuery } from "@tanstack/react-query";

export interface TestItem {
  title: string;
  testId: string;
}

export const useTestList = () => {
  return useQuery({
    queryKey: ["test-list"],
    queryFn: async () => {
      const response = await fetch("https://luyende.onrender.com/api/Home/list");
      if (!response.ok) {
        throw new Error("Failed to fetch test list");
      }
      return response.json() as Promise<TestItem[]>;
    },
  });
};
