import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { useExecuteWorkflow, useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import { editorAtom } from "../store/atoms";

export const ExecuteWorkflowButton = ({
  workflowId,
  size = "lg",
}: {
  workflowId: string;
  size?: "default" | "sm" | "lg" | "icon";
}) => {
  const editor = useAtomValue(editorAtom);
  const updateWorkflow = useUpdateWorkflow();
  const executeWorkflow = useExecuteWorkflow();

  const isPending = updateWorkflow.isPending || executeWorkflow.isPending;

  const handleExecute = async () => {
    if (editor) {
      const nodes = editor.getNodes();
      const edges = editor.getEdges();
      try {
        await updateWorkflow.mutateAsync({
          id: workflowId,
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type ?? undefined,
            position: node.position,
            data: node.data ?? {},
          })),
          edges: edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? undefined,
            targetHandle: edge.targetHandle ?? undefined,
          })),
        });
      } catch {
        return;
      }
    }
    executeWorkflow.mutate({ id: workflowId });
  };

  return (
    <Button size={size} onClick={handleExecute} disabled={isPending}>
      <FlaskConicalIcon className="size-4" />
      {isPending ? "Saving…" : "Execute workflow"}
    </Button>
  );
};
