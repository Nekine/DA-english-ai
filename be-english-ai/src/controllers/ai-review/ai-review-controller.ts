import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  getAiReviewStats,
  getAiReviewSubmissionDetails,
  getAiReviewSubmissions,
  updateAiReviewSubmission,
} from "../../services/ai-review-service";

export async function getAiReviewStatsHandler(_req: Request, res: Response): Promise<void> {
  const stats = await getAiReviewStats();
  res.status(HTTP_STATUS.OK).json(stats);
}

export async function getAiReviewSubmissionsHandler(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const confidenceFilter = typeof req.query.confidenceFilter === "string" ? req.query.confidenceFilter : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const submissions = await getAiReviewSubmissions({
    ...(status ? { status } : {}),
    ...(confidenceFilter ? { confidenceFilter } : {}),
    ...(search ? { search } : {}),
  });

  res.status(HTTP_STATUS.OK).json(submissions);
}

export async function getAiReviewSubmissionDetailsHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid submission id" });
    return;
  }

  const details = await getAiReviewSubmissionDetails(id);
  if (!details) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(details);
}

export async function updateAiReviewSubmissionHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid submission id" });
    return;
  }

  const body = req.body as {
    finalScore?: number;
    reviewStatus?: string;
    reviewNotes?: string;
    reviewedBy?: number;
  };

  const finalScore = Number(body.finalScore);
  if (!Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "finalScore must be in range 0-100" });
    return;
  }

  const result = await updateAiReviewSubmission({
    id,
    finalScore,
    reviewStatus: String(body.reviewStatus ?? "pending"),
    ...(body.reviewNotes ? { reviewNotes: body.reviewNotes } : {}),
    ...(Number.isInteger(body.reviewedBy) ? { reviewedBy: body.reviewedBy } : {}),
  });

  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Submission not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}
