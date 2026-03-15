import { channel, topic } from "@inngest/realtime";

export const SEND_SMS_CHANNEL_NAME = "send-sms-execution";

export const sendSmsChannel = channel(SEND_SMS_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
