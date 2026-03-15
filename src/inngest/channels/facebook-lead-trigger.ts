import { channel, topic } from "@inngest/realtime";

export const FACEBOOK_LEAD_TRIGGER_CHANNEL_NAME = "facebook-lead-trigger-execution";

export const facebookLeadTriggerChannel = channel(FACEBOOK_LEAD_TRIGGER_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
