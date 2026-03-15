import { channel, topic } from "@inngest/realtime";

export const FACEBOOK_PAGE_CHANNEL_NAME = "facebook-page-execution";

export const facebookPageChannel = channel(FACEBOOK_PAGE_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
