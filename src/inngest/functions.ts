import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import {
  attachNodeResultToContext,
  createExecutionContext,
  getNodeExecutionOutput,
  getPublicContext,
} from "@/features/executions/lib/runtime-context";
import { formatAppErrorForLogs } from "@/features/workflows/lib/errors";
import { buildValidatedExecutionPlan } from "@/features/workflows/lib/validation";
import { ExecutionStatus, NodeType, Prisma } from "@/generated/prisma";
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
  stripExecutionMetadata,
} from "./execution-plan";

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      error: formatAppErrorForLogs(error),
      errorStack: error.stack,
    };
  }

  return {
    error: formatAppErrorForLogs(error),
    errorStack: undefined,
  };
};

const asJsonValue = (
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

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
          completedAt: new Date(),
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

    const execution = await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
          initialData: asJsonValue(executionInitialData),
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

      const credentialIds = (
        await prisma.credential.findMany({
          where: { userId: workflow.userId },
          select: { id: true },
        })
      ).map((credential) => credential.id);

      return buildValidatedExecutionPlan({
        workflow,
        initialData: executionInitialData,
        credentialIds,
      });
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

    let context = createExecutionContext(
      stripExecutionMetadata(executionInitialData),
    );

    for (const [index, node] of executionPlan.nodes.entries()) {
      const executor = getExecutor(node.type as NodeType);
      const nodeInput = getPublicContext(context);

      await step.run(`node-${index + 1}-${node.id}-start`, async () => {
        return prisma.executionNode.upsert({
          where: {
            executionId_nodeId: {
              executionId: execution.id,
              nodeId: node.id,
            },
          },
          update: {
            nodeName: node.name,
            nodeType: node.type,
            orderIndex: index,
            status: ExecutionStatus.RUNNING,
            input: asJsonValue(nodeInput),
            output: Prisma.JsonNull,
            error: null,
            errorStack: null,
            startedAt: new Date(),
            completedAt: null,
          },
          create: {
            executionId: execution.id,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            orderIndex: index,
            status: ExecutionStatus.RUNNING,
            input: asJsonValue(nodeInput),
          },
        });
      });

      try {
        const nextContext = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          userId,
          context,
          step,
          publish,
        });

        const runtimeContext = attachNodeResultToContext(
          context,
          nextContext,
          node,
        );
        const nodeOutput = getNodeExecutionOutput(runtimeContext, node.id);

        await step.run(`node-${index + 1}-${node.id}-success`, async () => {
          return prisma.executionNode.update({
            where: {
              executionId_nodeId: {
                executionId: execution.id,
                nodeId: node.id,
              },
            },
            data: {
              status: ExecutionStatus.SUCCESS,
              output: asJsonValue(nodeOutput),
              completedAt: new Date(),
            },
          });
        });

        context = runtimeContext;
      } catch (error) {
        const details = getErrorDetails(error);

        await step.run(`node-${index + 1}-${node.id}-failed`, async () => {
          return prisma.executionNode.update({
            where: {
              executionId_nodeId: {
                executionId: execution.id,
                nodeId: node.id,
              },
            },
            data: {
              status: ExecutionStatus.FAILED,
              error: details.error,
              errorStack: details.errorStack,
              completedAt: new Date(),
            },
          });
        });

        throw error;
      }
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: asJsonValue(getPublicContext(context)),
        },
      });
    });

    return {
      workflowId,
      result: getPublicContext(context),
    };
  },
);

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
