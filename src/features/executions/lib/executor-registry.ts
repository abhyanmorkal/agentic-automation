import { NodeType } from "@/generated/prisma";
import "@/features/executions/lib/handlebars-runtime";
import { facebookLeadTriggerExecutor } from "@/features/triggers/components/facebook-lead-trigger/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { scheduleTriggerExecutor } from "@/features/triggers/components/schedule-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { airtableExecutor } from "../components/airtable/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { facebookPageExecutor } from "../components/facebook-page/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { gmailExecutor } from "../components/gmail/executor";
import { googleDriveExecutor } from "../components/google-drive/executor";
import { googleSheetsExecutor } from "../components/google-sheets/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { instagramExecutor } from "../components/instagram/executor";
import { mcpToolExecutor } from "../components/mcp-tool/executor";
import { notionExecutor } from "../components/notion/executor";
import { openAiExecutor } from "../components/openai/executor";
import { sendEmailExecutor } from "../components/send-email/executor";
import { sendSmsExecutor } from "../components/send-sms/executor";
import { slackExecutor } from "../components/slack/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { whatsappExecutor } from "../components/whatsapp/executor";
import type { NodeExecutor } from "../types";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openAiExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.TELEGRAM]: telegramExecutor,
  [NodeType.NOTION]: notionExecutor,
  [NodeType.AIRTABLE]: airtableExecutor,
  [NodeType.SEND_EMAIL]: sendEmailExecutor,
  [NodeType.SEND_SMS]: sendSmsExecutor,
  [NodeType.GMAIL]: gmailExecutor,
  [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
  [NodeType.GOOGLE_DRIVE]: googleDriveExecutor,
  [NodeType.WHATSAPP]: whatsappExecutor,
  [NodeType.INSTAGRAM]: instagramExecutor,
  [NodeType.FACEBOOK_PAGE]: facebookPageExecutor,
  [NodeType.FACEBOOK_LEAD_TRIGGER]: facebookLeadTriggerExecutor,
  [NodeType.MCP_TOOL]: mcpToolExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
