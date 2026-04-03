import { channel, topic } from "@inngest/realtime";

export const IF_CHANNEL_NAME = "if-execution";

export const ifChannel = channel(IF_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
