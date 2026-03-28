import { Router } from "express";
import {
  getTransactionByIdHandler,
  getTransactionListHandler,
} from "../controllers/transaction/transaction-controller";
import { asyncHandler } from "../utils/async-handler";

export const transactionRoutes = Router();

transactionRoutes.get("/list", asyncHandler(getTransactionListHandler));
transactionRoutes.get("/:id", asyncHandler(getTransactionByIdHandler));
