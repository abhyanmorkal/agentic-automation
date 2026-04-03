import { channel, topic } from "@inngest/realtime";

export const MERGE_CHANNEL_NAME = "merge-execution";

export const mergeChannel = channel(MERGE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
