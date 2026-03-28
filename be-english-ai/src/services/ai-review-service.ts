import { aiReviewRepository } from "../database/repositories/ai-review-repository";

function toIso(value: Date | null): string {
  return value ? value.toISOString() : new Date().toISOString();
}

function inferQuestionCount(questionsJson: string): number {
  try {
    const parsed = JSON.parse(questionsJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export async function getAiReviewStats() {
  const row = await aiReviewRepository.getStats();
  return {
    totalPending: Number(row.TotalPending) || 0,
    totalApproved: Number(row.TotalApproved) || 0,
    totalRejected: Number(row.TotalRejected) || 0,
    lowConfidence: Number(row.LowConfidence) || 0,
    avgConfidence: Number(row.AvgConfidence) || 0,
    needsAttention: Number(row.NeedsAttention) || 0,
  };
}

export async function getAiReviewSubmissions(input: {
  status?: string;
  confidenceFilter?: string;
  search?: string;
}) {
  const rows = await aiReviewRepository.getSubmissions(input);
  return rows.map((row) => ({
    id: row.Id,
    exerciseId: row.ExerciseId,
    exerciseTitle: row.ExerciseTitle,
    exerciseCode: row.ExerciseCode,
    exerciseLevel: row.ExerciseLevel,
    exerciseType: row.ExerciseType,
    aiGenerated: true,
    ...(row.CreatedBy ? { createdBy: row.CreatedBy } : {}),
    createdAt: toIso(row.CreatedAt),
    ...(row.SourceType ? { sourceType: row.SourceType } : {}),
    totalQuestions: Number(row.TotalQuestions) || 0,
    reviewStatus: row.ReviewStatus,
    userId: row.UserId,
    userName: row.UserName,
    userEmail: row.UserEmail,
    originalScore: Number(row.OriginalScore) || 0,
    finalScore: Number(row.FinalScore) || 0,
    completedAt: toIso(row.CompletedAt),
    ...(row.ReviewNotes ? { reviewNotes: row.ReviewNotes } : {}),
    confidenceScore: Number(row.ConfidenceScore) || 0,
  }));
}

export async function getAiReviewSubmissionDetails(id: number) {
  const row = await aiReviewRepository.getSubmissionDetails(id);
  if (!row) {
    return null;
  }

  return {
    id: row.Id,
    exerciseId: row.ExerciseId,
    exerciseTitle: row.ExerciseTitle,
    questionsJson: row.QuestionsJson,
    correctAnswersJson: row.CorrectAnswersJson,
    userAnswersJson: row.UserAnswersJson,
    level: row.Level,
    type: row.Type,
    category: row.Category,
    totalQuestions: inferQuestionCount(row.QuestionsJson),
  };
}

export async function updateAiReviewSubmission(input: {
  id: number;
  finalScore: number;
  reviewStatus: string;
  reviewNotes?: string;
  reviewedBy?: number;
}) {
  const updated = await aiReviewRepository.updateReview(input.id, input.finalScore);
  if (!updated) {
    return null;
  }

  return {
    message: "Review updated successfully",
    submissionId: input.id,
    finalScore: input.finalScore,
    reviewStatus: input.reviewStatus,
  };
}
