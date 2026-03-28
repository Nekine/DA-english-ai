import { z } from "zod";

export const adminExercisesBulkSchema = z.object({
  exerciseIds: z.array(z.int().positive()).min(1, "exerciseIds must not be empty"),
  operation: z.enum(["delete", "activate", "deactivate"]),
});

export type AdminExercisesBulkDto = z.infer<typeof adminExercisesBulkSchema>;
