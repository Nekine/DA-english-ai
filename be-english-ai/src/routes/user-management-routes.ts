import { Router } from "express";
import {
	createUserManagementUserHandler,
	deleteUserManagementUserHandler,
	exportUsersToExcelHandler,
	getUserManagementNewUsersDatesHandler,
	getUserManagementUserDetailHandler,
	getUserManagementUsersHandler,
	importUsersFromExcelHandler,
	updateUserManagementUserHandler,
} from "../controllers/user-management/user-management-controller";
import { USER_ROLE } from "../constants/domain-values";
import { requireAuth } from "../middlewares/require-auth";
import { requireRoles } from "../middlewares/require-roles";
import { upload } from "../middlewares/upload";
import { validateBody } from "../middlewares/validate-body";
import {
	userManagementCreateUserSchema,
	userManagementUpdateUserSchema,
} from "../schemas/user-management-schemas";
import { asyncHandler } from "../utils/async-handler";

export const userManagementRoutes = Router();

userManagementRoutes.use(requireAuth);
userManagementRoutes.use(requireRoles([USER_ROLE.ADMIN]));

userManagementRoutes.get("/users", asyncHandler(getUserManagementUsersHandler));
userManagementRoutes.get("/users/new-users-dates", asyncHandler(getUserManagementNewUsersDatesHandler));
userManagementRoutes.get("/users/:id", asyncHandler(getUserManagementUserDetailHandler));
userManagementRoutes.post(
	"/users",
	validateBody(userManagementCreateUserSchema),
	asyncHandler(createUserManagementUserHandler),
);
userManagementRoutes.put(
	"/users/:id",
	validateBody(userManagementUpdateUserSchema),
	asyncHandler(updateUserManagementUserHandler),
);
userManagementRoutes.delete("/users/:id", asyncHandler(deleteUserManagementUserHandler));
userManagementRoutes.post(
	"/import-excel",
	upload.single("file"),
	asyncHandler(importUsersFromExcelHandler),
);
userManagementRoutes.get("/export-excel", asyncHandler(exportUsersToExcelHandler));
