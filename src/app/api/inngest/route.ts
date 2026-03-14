import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow, scheduleDispatcher } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    scheduleDispatcher,
  ],
});
