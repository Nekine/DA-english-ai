import { ToeicPartKey, ToeicPartScore } from "@/types/toeic";

interface ToeicPartDefinition {
  key: ToeicPartKey;
  part: string;
  title: string;
  label: string;
  description: string;
  skill: "Listening" | "Reading";
  questionTypes: string[];
  color: string;
}

export const TOEIC_PARTS: ToeicPartDefinition[] = [
  {
    key: "part1",
    part: "Part 1",
    title: "Photographs",
    label: "Part 1 · Photographs",
    description: "Nghe mô tả và chọn câu đúng nhất với bức ảnh.",
    skill: "Listening",
    questionTypes: ["Trọng âm & phát âm", "Từ vựng chủ đề hình ảnh", "Mô tả vật thể"],
    color: "#f97316",
  },
  {
    key: "part2",
    part: "Part 2",
    title: "Question-Response",
    label: "Part 2 · Question-Response",
    description: "Nghe câu hỏi và chọn câu trả lời phù hợp.",
    skill: "Listening",
    questionTypes: ["Hoàn thành hội thoại", "Phản xạ câu hỏi nhanh"],
    color: "#fb923c",
  },
  {
    key: "part3",
    part: "Part 3",
    title: "Conversations",
    label: "Part 3 · Conversations",
    description: "Nghe các đoạn hội thoại ngắn giữa hai hoặc ba người.",
    skill: "Listening",
    questionTypes: ["Hội thoại", "Sắp xếp câu", "Ý nghĩa từ trong ngữ cảnh"],
    color: "#facc15",
  },
  {
    key: "part4",
    part: "Part 4",
    title: "Short Talks",
    label: "Part 4 · Talks",
    description: "Nghe bài nói đơn và trả lời câu hỏi chi tiết.",
    skill: "Listening",
    questionTypes: ["Chọn tiêu đề phù hợp", "Cloze Test", "Ý chính bài nói"],
    color: "#a3e635",
  },
  {
    key: "part5",
    part: "Part 5",
    title: "Incomplete Sentences",
    label: "Part 5 · Incomplete Sentences",
    description: "Chọn đáp án đúng để hoàn thành câu.",
    skill: "Reading",
    questionTypes: ["Chọn từ thích hợp", "Chia động từ", "Điền vào chỗ trống", "Ngữ pháp"],
    color: "#34d399",
  },
  {
    key: "part6",
    part: "Part 6",
    title: "Text Completion",
    label: "Part 6 · Text Completion",
    description: "Điền từ hoặc đoạn phù hợp vào đoạn văn.",
    skill: "Reading",
    questionTypes: ["Cloze Test", "Ghép câu", "Chuyển đổi từ loại", "Từ vựng trong ngữ cảnh"],
    color: "#38bdf8",
  },
  {
    key: "part7",
    part: "Part 7",
    title: "Reading Comprehension",
    label: "Part 7 · Reading",
    description: "Đọc hiểu một hoặc nhiều đoạn văn và trả lời câu hỏi.",
    skill: "Reading",
    questionTypes: ["Đọc hiểu", "Chọn tiêu đề", "Sắp xếp thông tin", "Tìm nghĩa của từ"],
    color: "#c084fc",
  },
];

export const EMPTY_PART_SCORES: ToeicPartScore[] = TOEIC_PARTS.map((part) => ({
  key: part.key,
  part: part.part,
  label: part.label,
  title: part.title,
  skill: part.skill,
  description: part.description,
  questionTypes: part.questionTypes,
  score: 0,
  attempts: 0,
  color: part.color,
}));

