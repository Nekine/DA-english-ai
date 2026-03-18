export type ToeicPartKey =
  | "part1"
  | "part2"
  | "part3"
  | "part4"
  | "part5"
  | "part6"
  | "part7";

export interface ToeicPartScore {
  key: ToeicPartKey;
  part: string;
  title: string;
  label: string;
  skill: "Listening" | "Reading";
  description: string;
  questionTypes: string[];
  score: number;
  attempts: number;
  color?: string;
}

