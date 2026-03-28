import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  getRevenuePayment,
  getSystemStatistics,
  getUserGrowth,
  getUsersByRole,
} from "../../services/statistics-service";

export async function getSystemStatisticsHandler(_req: Request, res: Response): Promise<void> {
  const data = await getSystemStatistics();
  res.status(HTTP_STATUS.OK).json(data);
}

export async function getUsersByRoleHandler(_req: Request, res: Response): Promise<void> {
  const data = await getUsersByRole();
  res.status(HTTP_STATUS.OK).json(data);
}

export async function getUserGrowthHandler(_req: Request, res: Response): Promise<void> {
  const data = await getUserGrowth();
  res.status(HTTP_STATUS.OK).json(data);
}

export async function getRevenuePaymentHandler(_req: Request, res: Response): Promise<void> {
  const data = await getRevenuePayment();
  res.status(HTTP_STATUS.OK).json(data);
}
