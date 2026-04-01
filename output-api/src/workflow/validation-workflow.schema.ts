import { BadRequestException } from "@nestjs/common";
import { z, ZodError } from "zod";
import { ValidationWorkflow } from "./ValidationWorkflow.entity";

const ValidationWorkflowSourceSchema = z.object({
  workflow_id: z.string(),
  label: z.string().trim().min(1),
  target: z.preprocess((value) => value === null ? undefined : value, z.string().trim().min(1).optional()),
  target_filter: z.preprocess((value) => value === null ? undefined : value, z.unknown().optional()),
  rules: z.preprocess((value) => value === null ? undefined : value, z.array(z.unknown()).optional()),
}).passthrough();

export function validateValidationWorkflow(workflow: ValidationWorkflow): ValidationWorkflow {
  try {
    return ValidationWorkflowSourceSchema.parse(workflow);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));
      throw new BadRequestException({
        message: "Validation failed",
        details,
      });
    }

    throw error;
  }
}
