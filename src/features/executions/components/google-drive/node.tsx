"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Google } from "@lobehub/icons";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleDriveDialog, type GoogleDriveFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleDriveRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_CHANNEL_NAME } from "@/inngest/channels/google-drive";

type GoogleDriveNodeData = { action?: "list" | "create_folder"; folderId?: string; folderName?: string; credentialId?: string; variableName?: string };
type GoogleDriveNodeType = Node<GoogleDriveNodeData>;

export const GoogleDriveNode = memo((props: NodeProps<GoogleDriveNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveRealtimeToken,
  });

  const handleSubmit = (values: GoogleDriveFormValues) => {
    setNodes((nodes) => nodes.map((n) => n.id === props.id ? { ...n, data: { ...n.data, ...values } } : n));
  };

  const description = props.data?.action
    ? props.data.action === "list" ? "List files" : `Create folder: ${props.data.folderName ?? ""}`
    : "Not configured";

  return (
    <>
      <GoogleDriveDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleSubmit} defaultValues={props.data} />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Google.Color}
        name="Google Drive"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GoogleDriveNode.displayName = "GoogleDriveNode";
