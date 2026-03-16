"use client";

import { formatDistanceToNow } from "date-fns";
import { 
  EmptyView,
  EntityContainer, 
  EntityHeader, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  ErrorView,
  LoadingView
} from "@/components/entity-components";
import { useRetryExecution, useSuspenseExecutions } from "../hooks/use-executions"
import { useExecutionsParams } from "../hooks/use-executions-params";
import type { Execution } from "@/generated/prisma";
import { ExecutionStatus } from "@/generated/prisma";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, RefreshCwIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export const ExecutionsList = () => {
  const executions = useSuspenseExecutions();

  return (
    <EntityList
      items={executions.data.items}
      getKey={(execution) => execution.id}
      renderItem={(execution) => <ExecutionItem data={execution} />}
      emptyView={<ExecutionsEmpty />}
    />
  );
};

export const ExecutionsHeader = () => {
  return (
    <EntityHeader
      title="Executions"
      description="View your workflow execution history"
    />
  );
};

export const ExecutionsPagination = () => {
  const executions = useSuspenseExecutions();
  const [params, setParams] = useExecutionsParams();

  return (
    <EntityPagination
      disabled={executions.isFetching}
      totalPages={executions.data.totalPages}
      page={executions.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const ExecutionsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<ExecutionsHeader />}
      pagination={<ExecutionsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const ExecutionsLoading = () => {
  return <LoadingView message="Loading executions..." />;
};

export const ExecutionsError = () => {
  return <ErrorView message="Error loading executions" />;
};

export const ExecutionsEmpty = () => {
  return (
    <EmptyView
      message="You haven't created any executions yet. Get started by running your first workflow"
    />
  );
};

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
}

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionItem = ({
  data,
}: { 
  data: Execution & {
    workflow: {
      id: string;
      name: string;
    };
  };
}) => {
  const retryExecution = useRetryExecution();
  const [contextOpen, setContextOpen] = useState(false);

  const duration = data.completedAt
    ? Math.round(
      (new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000,
    )
    : null;

  const subtitle = (
    <>
      {data.workflow.name} &bull; Started{" "}
      {formatDistanceToNow(data.startedAt, { addSuffix: true })}
      {duration !== null && <> &bull; Took {duration}s </>}
    </>
  );

  return (
    <>
      <EntityItem
        href={`/executions/${data.id}`}
        title={formatStatus(data.status)}
        subtitle={subtitle}
        image={
          <div className="size-8 flex items-center justify-center">
            {getStatusIcon(data.status)}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextOpen(true);
              }}
            >
              View context
            </Button>
            {data.status === ExecutionStatus.FAILED && (
              <Button
                size="sm"
                variant="outline"
                disabled={retryExecution.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  retryExecution.mutate({ id: data.id });
                }}
              >
                <RefreshCwIcon className="size-3" />
                Retry
              </Button>
            )}
          </div>
        }
      />
      <Dialog open={contextOpen} onOpenChange={setContextOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Execution context</DialogTitle>
          </DialogHeader>
          <pre className="mt-2 max-h-[480px] overflow-auto rounded bg-muted p-3 text-xs font-mono">
            {JSON.stringify(
              {
                initialData: data.initialData,
                output: data.output,
              },
              null,
              2,
            )}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  )
};
