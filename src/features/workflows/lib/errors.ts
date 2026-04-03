import { TRPCError } from "@trpc/server";

export type AppErrorCode =
  | "WORKFLOW_VALIDATION"
  | "WORKFLOW_CONFIGURATION"
  | "CREDENTIAL"
  | "PROVIDER"
  | "EXECUTION";

export type WorkflowValidationIssue = {
  nodeId?: string;
  edgeId?: string;
  field?: string;
  message: string;
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class WorkflowValidationError extends AppError {
  constructor(public readonly issues: WorkflowValidationIssue[]) {
    super("WORKFLOW_VALIDATION", formatWorkflowValidationIssues(issues));
    this.name = "WorkflowValidationError";
  }
}

export const formatWorkflowValidationIssues = (
  issues: WorkflowValidationIssue[],
) => {
  const [firstIssue, ...remainingIssues] = issues;
  if (!firstIssue) {
    return "Workflow validation failed";
  }

  if (remainingIssues.length === 0) {
    return firstIssue.message;
  }

  return `${firstIssue.message} (+${remainingIssues.length} more issue${remainingIssues.length === 1 ? "" : "s"})`;
};

export const formatAppErrorForLogs = (error: unknown) => {
  if (error instanceof WorkflowValidationError) {
    return `[${error.code}] ${formatWorkflowValidationIssues(error.issues)}`;
  }

  if (error instanceof AppError) {
    return `[${error.code}] ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown application error";
};

export const toTRPCError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof WorkflowValidationError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: formatWorkflowValidationIssues(error.issues),
    });
  }

  if (error instanceof AppError) {
    return new TRPCError({
      code:
        error.code === "EXECUTION" || error.code === "PROVIDER"
          ? "INTERNAL_SERVER_ERROR"
          : "BAD_REQUEST",
      message: error.message,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};
