import { Router } from "express";
import { getUserByIdHandler, getUsersHandler } from "../controllers/users/users-controller";
import { USER_ROLE } from "../constants/domain-values";
import { requireAuth } from "../middlewares/require-auth";
import { requireRoles } from "../middlewares/require-roles";
import { asyncHandler } from "../utils/async-handler";

export const usersRoutes = Router();

usersRoutes.use(requireAuth);
usersRoutes.use(requireRoles([USER_ROLE.ADMIN]));

usersRoutes.get("/", asyncHandler(getUsersHandler));
usersRoutes.get("/:id", asyncHandler(getUserByIdHandler));
