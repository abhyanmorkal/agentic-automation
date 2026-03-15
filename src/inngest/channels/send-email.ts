import { channel, topic } from "@inngest/realtime";

export const SEND_EMAIL_CHANNEL_NAME = "send-email-execution";

export const sendEmailChannel = channel(SEND_EMAIL_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
