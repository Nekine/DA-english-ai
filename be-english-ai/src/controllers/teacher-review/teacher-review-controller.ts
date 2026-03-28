import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getMyTeacherReviews, getTeacherReviewDetail } from "../../services/teacher-review-service";

export async function getMyTeacherReviewsHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.query.userId ?? 0);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid userId" });
    return;
  }

  const reviews = await getMyTeacherReviews(userId);
  res.status(HTTP_STATUS.OK).json(reviews);
}

export async function getTeacherReviewDetailHandler(req: Request, res: Response): Promise<void> {
  const completionId = Number(req.params.completionId);
  const userId = Number(req.query.userId ?? 0);

  if (!Number.isInteger(completionId) || completionId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid completionId" });
    return;
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid userId" });
    return;
  }

  const detail = await getTeacherReviewDetail(completionId, userId);
  if (!detail) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Review not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(detail);
}
