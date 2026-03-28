import { Router } from "express";
import { checkUserHandler, generateHashHandler } from "../controllers/debug/debug-controller";

export const debugRoutes = Router();

debugRoutes.get("/check-user/:emailOrUsername", checkUserHandler);
debugRoutes.post("/generate-hash", generateHashHandler);
