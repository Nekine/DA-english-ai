import { Router } from "express";
import {
  bulkOperationExercisesHandler,
	deleteAdminExerciseHandler,
	deleteAdminTestHandler,
	getAdminContentSummaryHandler,
	getDashboardHandler,
	getExerciseAnalyticsHandler,
	listAdminExercisesHandler,
	listAdminTestsHandler,
} from "../controllers/admin/admin-controller";
import { USER_ROLE } from "../constants/domain-values";
import { requireAuth } from "../middlewares/require-auth";
import { requireRoles } from "../middlewares/require-roles";
import { validateBody } from "../middlewares/validate-body";
import { adminExercisesBulkSchema } from "../schemas/admin-schemas";
import { asyncHandler } from "../utils/async-handler";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireRoles([USER_ROLE.ADMIN]));

adminRoutes.get("/dashboard", asyncHandler(getDashboardHandler));
adminRoutes.get("/content/summary", asyncHandler(getAdminContentSummaryHandler));
adminRoutes.get("/content/exercises", asyncHandler(listAdminExercisesHandler));
adminRoutes.get("/content/tests", asyncHandler(listAdminTestsHandler));
adminRoutes.delete("/content/exercises/:id", asyncHandler(deleteAdminExerciseHandler));
adminRoutes.delete("/content/tests/:id", asyncHandler(deleteAdminTestHandler));
adminRoutes.get("/exercises/:id/analytics", asyncHandler(getExerciseAnalyticsHandler));
adminRoutes.post(
	"/exercises/bulk",
	validateBody(adminExercisesBulkSchema),
	asyncHandler(bulkOperationExercisesHandler),
);
