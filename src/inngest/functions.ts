import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { airtableChannel } from "./channels/airtable";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { facebookLeadTriggerChannel } from "./channels/facebook-lead-trigger";
import { facebookPageChannel } from "./channels/facebook-page";
import { geminiChannel } from "./channels/gemini";
import { gmailChannel } from "./channels/gmail";
import { googleDriveChannel } from "./channels/google-drive";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { googleSheetsChannel } from "./channels/google-sheets";
import { httpRequestChannel } from "./channels/http-request";
import { instagramChannel } from "./channels/instagram";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { mcpToolChannel } from "./channels/mcp-tool";
import { notionChannel } from "./channels/notion";
import { openAiChannel } from "./channels/openai";
import { scheduleTriggerChannel } from "./channels/schedule-trigger";
import { sendEmailChannel } from "./channels/send-email";
import { sendSmsChannel } from "./channels/send-sms";
import { slackChannel } from "./channels/slack";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { telegramChannel } from "./channels/telegram";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { whatsappChannel } from "./channels/whatsapp";
import { inngest } from "./client";
import { cronMatchesNow } from "./cron-utils";
import {
  attachExecutionMetadata,
  planWorkflowExecution,
  stripExecutionMetadata,
} from "./execution-plan";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, step: _step }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      webhookTriggerChannel(),
      scheduleTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      telegramChannel(),
      notionChannel(),
      airtableChannel(),
      sendEmailChannel(),
      sendSmsChannel(),
      gmailChannel(),
      googleSheetsChannel(),
      googleDriveChannel(),
      whatsappChannel(),
      instagramChannel(),
      facebookPageChannel(),
      mcpToolChannel(),
      facebookLeadTriggerChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;
    const executionInitialData = attachExecutionMetadata(
      event.data.initialData,
      {
        triggerNodeId: event.data.triggerNodeId,
        triggerType: event.data.triggerType as NodeType | undefined,
      },
    );

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
          initialData: executionInitialData,
        },
      });
    });

    const executionPlan = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      return planWorkflowExecution(workflow, executionInitialData);
    });

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          userId: true,
        },
      });

      return workflow.userId;
    });

    // Initialize context with any initial data from the trigger
    let context = stripExecutionMetadata(executionInitialData);

    // Execute each node on the selected trigger path only.
    for (const node of executionPlan.nodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  },
);

/**
 * Runs every minute and fires any workflow whose SCHEDULE_TRIGGER cron
 * expression matches the current UTC minute.
 */
export const scheduleDispatcher = inngest.createFunction(
  { id: "schedule-dispatcher" },
  { cron: "* * * * *" },
  async ({ step }) => {
    const scheduledNodes = await step.run("find-scheduled-nodes", async () => {
      return prisma.node.findMany({
        where: { type: NodeType.SCHEDULE_TRIGGER },
        select: { id: true, workflowId: true, data: true },
      });
    });

    const matching = scheduledNodes.filter((node) => {
      const data = node.data as { cronExpression?: string };
      return data.cronExpression && cronMatchesNow(data.cronExpression);
    });

    if (matching.length === 0) return { fired: 0 };

    await step.sendEvent(
      "fire-scheduled-workflows",
      matching.map((node) => {
        const data = node.data as {
          cronExpression?: string;
          timezone?: string;
        };
        return {
          name: "workflows/execute.workflow" as const,
          data: {
            workflowId: node.workflowId,
            triggerNodeId: node.id,
            triggerType: NodeType.SCHEDULE_TRIGGER,
            initialData: {
              schedule: {
                triggeredAt: new Date().toISOString(),
                cronExpression: data.cronExpression,
                timezone: data.timezone || "UTC",
              },
            },
          },
        };
      }),
    );

    return { fired: matching.length };
  },
);
