"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSuspenseExecution } from "@/features/executions/hooks/use-executions";
import { ExecutionStatus } from "@/generated/prisma";

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;
  }
};

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

const JsonBlock = ({
  label,
  value,
  defaultOpen = false,
}: {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const json = JSON.stringify(value, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
          {label}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json);
            } catch {
              // Ignore clipboard errors in read-only debug UI.
            }
          }}
        >
          <CopyIcon className="mr-1 size-3.5" />
          Copy
        </Button>
      </div>
      {open && (
        <pre className="max-h-72 overflow-auto rounded bg-muted p-3 text-xs font-mono">
          {json}
        </pre>
      )}
    </div>
  );
};

export const ExecutionView = ({ executionId }: { executionId: string }) => {
  const { data: execution } = useSuspenseExecution(executionId);
  const [showStackTrace, setShowStackTrace] = useState(false);

  const duration = execution.completedAt
    ? Math.round(
        (new Date(execution.completedAt).getTime() -
          new Date(execution.startedAt).getTime()) /
          1000,
      )
    : null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon(execution.status)}
          <div>
            <CardTitle>{formatStatus(execution.status)}</CardTitle>
            <CardDescription>
              Execution for {execution.workflow.name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Workflow
            </p>
            <Link
              prefetch
              className="text-sm hover:underline text-primary"
              href={`/workflows/${execution.workflowId}`}
            >
              {execution.workflow.name}
            </Link>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <p className="text-sm">{formatStatus(execution.status)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Started</p>
            <p className="text-sm">
              {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
            </p>
          </div>

          {execution.completedAt ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              <p className="text-sm">
                {formatDistanceToNow(execution.completedAt, {
                  addSuffix: true,
                })}
              </p>
            </div>
          ) : null}

          {duration !== null ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Duration
              </p>
              <p className="text-sm">{duration}s</p>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Event ID
            </p>
            <p className="text-sm">{execution.inngestEventId}</p>
          </div>
        </div>
        {execution.nodeExecutions.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Debug summary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {execution.nodeExecutions.length} node
                {execution.nodeExecutions.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="secondary">
                {
                  execution.nodeExecutions.filter(
                    (nodeExecution) =>
                      nodeExecution.status === ExecutionStatus.SUCCESS,
                  ).length
                }{" "}
                succeeded
              </Badge>
              <Badge variant="secondary">
                {
                  execution.nodeExecutions.filter(
                    (nodeExecution) =>
                      nodeExecution.status === ExecutionStatus.FAILED,
                  ).length
                }{" "}
                failed
              </Badge>
              {duration !== null ? (
                <Badge variant="secondary">Total {duration}s</Badge>
              ) : null}
            </div>
          </div>
        )}
        {execution.error && (
          <div className="mt-6 p-4 bg-red-50 rounded-md space-y-3">
            <div>
              <p className="text-sm font-medium text-red-900 mb-2">Error</p>
              <p className="text-sm text-red-800 font-mono">
                {execution.error}
              </p>
            </div>

            {execution.errorStack && (
              <Collapsible
                open={showStackTrace}
                onOpenChange={setShowStackTrace}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-900 hover:bg-red-100"
                  >
                    {showStackTrace ? "Hide stack trace" : "Show stack trace"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs font-mono text-red-800 overflow-auto mt-2 p-2 bg-red-100">
                    {execution.errorStack}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {execution.output && (
          <div className="mt-6 p-4 bg-muted rounded-md">
            <JsonBlock label="Workflow output" value={execution.output} />
          </div>
        )}

        {execution.nodeExecutions.length > 0 && (
          <div className="mt-6 space-y-3">
            <div>
              <p className="text-sm font-medium">Node timeline</p>
              <p className="text-sm text-muted-foreground">
                Per-node execution input, output, and errors for this run.
              </p>
            </div>
            <div className="space-y-3">
              {execution.nodeExecutions.map((nodeExecution) => {
                const nodeDuration = nodeExecution.completedAt
                  ? Math.round(
                      (new Date(nodeExecution.completedAt).getTime() -
                        new Date(nodeExecution.startedAt).getTime()) /
                        1000,
                    )
                  : null;

                return (
                  <div
                    key={nodeExecution.id}
                    className="rounded-md border bg-background p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(nodeExecution.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {nodeExecution.nodeName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {nodeExecution.nodeType}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatStatus(nodeExecution.status)}</p>
                        {nodeDuration !== null ? <p>{nodeDuration}s</p> : null}
                        <p>Step {nodeExecution.orderIndex + 1}</p>
                      </div>
                    </div>

                    {nodeExecution.error && (
                      <div className="rounded-md bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-900">
                          Node error
                        </p>
                        <p className="mt-1 text-xs font-mono text-red-800">
                          {nodeExecution.error}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <JsonBlock
                        label="Input"
                        value={nodeExecution.input}
                        defaultOpen={
                          nodeExecution.status === ExecutionStatus.FAILED
                        }
                      />
                      <JsonBlock
                        label="Output"
                        value={nodeExecution.output}
                        defaultOpen={
                          nodeExecution.status === ExecutionStatus.FAILED
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
