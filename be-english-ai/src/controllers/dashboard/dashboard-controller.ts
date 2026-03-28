import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getDashboard } from "../../services/admin-service";

export async function getDashboardCompatibilityHandler(_req: Request, res: Response): Promise<void> {
  const dashboard = await getDashboard();
  res.status(HTTP_STATUS.OK).json(dashboard);
}
