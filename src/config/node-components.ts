import { InitialNode } from "@/components/initial-node";
import { NodeType } from "@/generated/prisma";
import type { NodeTypes } from "@xyflow/react";

import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { ScheduleTriggerNode } from "@/features/triggers/components/schedule-trigger/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { OpenAiNode } from "@/features/executions/components/openai/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { NotionNode } from "@/features/executions/components/notion/node";
import { AirtableNode } from "@/features/executions/components/airtable/node";
import { SendEmailNode } from "@/features/executions/components/send-email/node";
import { SendSmsNode } from "@/features/executions/components/send-sms/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { GoogleSheetsNode } from "@/features/executions/components/google-sheets/node";
import { GoogleDriveNode } from "@/features/executions/components/google-drive/node";
import { WhatsAppNode } from "@/features/executions/components/whatsapp/node";
import { InstagramNode } from "@/features/executions/components/instagram/node";
import { FacebookPageNode } from "@/features/executions/components/facebook-page/node";
import { FacebookLeadTriggerNode } from "@/features/triggers/components/facebook-lead-trigger/node";
import { McpToolNode } from "@/features/executions/components/mcp-tool/node";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.TELEGRAM]: TelegramNode,
  [NodeType.NOTION]: NotionNode,
  [NodeType.AIRTABLE]: AirtableNode,
  [NodeType.SEND_EMAIL]: SendEmailNode,
  [NodeType.SEND_SMS]: SendSmsNode,
  [NodeType.GMAIL]: GmailNode,
  [NodeType.GOOGLE_SHEETS]: GoogleSheetsNode,
  [NodeType.GOOGLE_DRIVE]: GoogleDriveNode,
  [NodeType.WHATSAPP]: WhatsAppNode,
  [NodeType.INSTAGRAM]: InstagramNode,
  [NodeType.FACEBOOK_PAGE]: FacebookPageNode,
  [NodeType.FACEBOOK_LEAD_TRIGGER]: FacebookLeadTriggerNode,
  [NodeType.MCP_TOOL]: McpToolNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
