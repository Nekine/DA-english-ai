import { teacherReviewRepository } from "../database/repositories/teacher-review-repository";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function getMyTeacherReviews(userId: number) {
  const rows = await teacherReviewRepository.getMyReviews(userId);
  return rows.map((row) => ({
    completionId: row.completionId,
    exerciseId: row.exerciseId,
    exerciseTitle: row.exerciseTitle,
    exerciseType: row.exerciseType,
    exerciseCategory: row.exerciseCategory,
    originalScore: row.originalScore,
    finalScore: row.finalScore,
    reviewStatus: row.reviewStatus,
    reviewNotes: row.reviewNotes,
    reviewedAt: toIso(row.reviewedAt),
    completedAt: toIso(row.completedAt),
    confidenceScore: row.confidenceScore,
    reviewerName: row.reviewerName,
    reviewerEmail: row.reviewerEmail,
  }));
}

export async function getTeacherReviewDetail(completionId: number, userId: number) {
  const row = await teacherReviewRepository.getReviewDetail(completionId, userId);
  if (!row) {
    return null;
  }

  return {
    completionId: row.completionId,
    exerciseId: row.exerciseId,
    exerciseTitle: row.exerciseTitle,
    exerciseType: row.exerciseType,
    exerciseCategory: row.exerciseCategory,
    userAnswersJson: row.userAnswersJson,
    questionsJson: row.questionsJson,
    correctAnswersJson: row.correctAnswersJson,
    originalScore: row.originalScore,
    finalScore: row.finalScore,
    reviewStatus: row.reviewStatus,
    reviewNotes: row.reviewNotes,
    reviewedAt: toIso(row.reviewedAt),
    completedAt: toIso(row.completedAt),
    confidenceScore: row.confidenceScore,
    reviewerName: row.reviewerName,
    reviewerEmail: row.reviewerEmail,
  };
}
