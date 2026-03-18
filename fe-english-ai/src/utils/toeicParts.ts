import { TOEIC_PARTS, EMPTY_PART_SCORES } from "@/constants/toeicParts";
import type { ToeicPartKey, ToeicPartScore } from "@/types/toeic";

export const normalizePartKey = (value?: string | null): ToeicPartKey => {
  if (!value) return "part7";
  const digits = value.replace(/[^0-9]/g, "");
  const parsed = parseInt(digits, 10);
  if (parsed >= 1 && parsed <= 7) {
    return `part${parsed}` as ToeicPartKey;
  }
  const normalized = value.toLowerCase().trim();
  const match = TOEIC_PARTS.find(
    (part) =>
      part.key === normalized ||
      part.part.toLowerCase() === normalized ||
      part.label.toLowerCase() === normalized
  );
  return (match?.key ?? "part7") as ToeicPartKey;
};

export const normalizeToeicParts = (
  parts?: ToeicPartScore[] | null
): ToeicPartScore[] => {
  if (!parts?.length) {
    return EMPTY_PART_SCORES;
  }

  const map = new Map<ToeicPartKey, ToeicPartScore>(
    parts.map((part) => [normalizePartKey(part.key ?? part.part), part])
  );

  return TOEIC_PARTS.map((definition) => {
    const existing = map.get(definition.key);
    return {
      key: definition.key,
      part: definition.part,
      label: definition.label,
      title: definition.title,
      skill: definition.skill,
      description: definition.description,
      questionTypes: existing?.questionTypes?.length
        ? existing.questionTypes
        : definition.questionTypes,
      score: existing?.score ?? 0,
      attempts: existing?.attempts ?? 0,
      color: definition.color,
    };
  });
};

export const createPartScoreMap = (
  parts: ToeicPartScore[]
): Record<ToeicPartKey, number> => {
  const map = {} as Record<ToeicPartKey, number>;
  TOEIC_PARTS.forEach((part) => {
    map[part.key] =
      parts.find((item) => item.key === part.key)?.score ?? 0;
  });
  return map;
};

export const getPartMeta = (key: ToeicPartKey) =>
  TOEIC_PARTS.find((part) => part.key === key);

export const createEmptyPartScores = () => createPartScoreMap(EMPTY_PART_SCORES);

