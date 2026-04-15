import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import {
  bulkOperationExercises,
  deleteAdminExercise,
  deleteAdminTest,
  getAdminContentSummary,
  getDashboard,
  getExerciseAnalytics,
  listAdminExercises,
  listAdminTests,
} from "../../services/admin-service";
import type { AdminExercisesBulkDto } from "../../schemas/admin-schemas";

export async function getDashboardHandler(_req: Request, res: Response): Promise<void> {
  const dashboard = await getDashboard();
  res.status(HTTP_STATUS.OK).json(dashboard);
}

export async function getAdminContentSummaryHandler(_req: Request, res: Response): Promise<void> {
  const summary = await getAdminContentSummary();
  res.status(HTTP_STATUS.OK).json(summary);
}

export async function listAdminExercisesHandler(_req: Request, res: Response): Promise<void> {
  const items = await listAdminExercises();
  res.status(HTTP_STATUS.OK).json(items);
}

export async function listAdminTestsHandler(_req: Request, res: Response): Promise<void> {
  const items = await listAdminTests();
  res.status(HTTP_STATUS.OK).json(items);
}

export async function deleteAdminExerciseHandler(req: Request, res: Response): Promise<void> {
  const exerciseId = Number(req.params.id);
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    throw new AppError("Invalid exercise id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const deleted = await deleteAdminExercise(exerciseId);
  if (!deleted) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function deleteAdminTestHandler(req: Request, res: Response): Promise<void> {
  const testId = Number(req.params.id);
  if (!Number.isInteger(testId) || testId <= 0) {
    throw new AppError("Invalid test id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const deleted = await deleteAdminTest(testId);
  if (!deleted) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Test not found" });
    return;
  }

  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getExerciseAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const exerciseId = Number(req.params.id);
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    throw new AppError("Invalid exercise id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const analytics = await getExerciseAnalytics(exerciseId);
  if (!analytics) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(analytics);
}

export async function bulkOperationExercisesHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as AdminExercisesBulkDto;

  const result = await bulkOperationExercises({
    exerciseIds: body.exerciseIds,
    operation: body.operation,
  });

  res.status(result.statusCode).json({ message: result.message });
}
