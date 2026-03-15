"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import {
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MousePointerIcon,
  PlugIcon,
  SmartphoneIcon,
  WebhookIcon,
} from "lucide-react";
import { Anthropic, Gemini, Google, Meta, Notion, OpenAI } from "@lobehub/icons";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NodeType } from "@/generated/prisma";
import { Separator } from "./ui/separator";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }> | string;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger manually",
    description: "Runs the flow on clicking a button. Good for getting started quickly",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form",
    description: "Runs the flow when a Google Form is submitted",
    icon: "/logos/googleform.svg",
  },
  {
    type: NodeType.STRIPE_TRIGGER,
    label: "Stripe Event",
    description: "Runs the flow when a Stripe Event is captured",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.WEBHOOK_TRIGGER,
    label: "Webhook",
    description: "Runs the flow when any HTTP POST is received — works with Razorpay, Typeform, Shopify, and more",
    icon: WebhookIcon,
  },
  {
    type: NodeType.SCHEDULE_TRIGGER,
    label: "Schedule",
    description: "Runs the flow automatically on a cron schedule — every hour, daily, weekly, or custom",
    icon: ClockIcon,
  },
];

const aiNodes: NodeTypeOption[] = [
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Uses OpenAI GPT-4 to generate text, summaries, or structured data",
    icon: OpenAI,
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Uses Google Gemini to generate text",
    icon: Gemini.Color,
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic",
    description: "Uses Anthropic Claude to generate text",
    icon: Anthropic,
  },
];

const communicationNodes: NodeTypeOption[] = [
  {
    type: NodeType.SLACK,
    label: "Slack",
    description: "Send a message to a Slack channel via webhook",
    icon: "/logos/slack.svg",
  },
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Send a message to a Discord channel",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.TELEGRAM,
    label: "Telegram",
    description: "Send a message to a Telegram chat or channel via Bot API",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.SEND_EMAIL,
    label: "Send Email",
    description: "Send a transactional email via Resend",
    icon: MailIcon,
  },
  {
    type: NodeType.SEND_SMS,
    label: "Send SMS",
    description: "Send an SMS via Twilio",
    icon: SmartphoneIcon,
  },
  {
    type: NodeType.WHATSAPP,
    label: "WhatsApp",
    description: "Send a WhatsApp message via Meta Business API",
    icon: Meta.Color,
  },
];

const googleNodes: NodeTypeOption[] = [
  {
    type: NodeType.GMAIL,
    label: "Gmail",
    description: "Send an email from your connected Gmail account via OAuth",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.GOOGLE_SHEETS,
    label: "Google Sheets",
    description: "Append rows or read data from a Google Spreadsheet",
    icon: "/logos/googlesheets.svg",
  },
  {
    type: NodeType.GOOGLE_DRIVE,
    label: "Google Drive",
    description: "List files or create folders in Google Drive",
    icon: Google.Color,
  },
];

const productivityNodes: NodeTypeOption[] = [
  {
    type: NodeType.NOTION,
    label: "Notion",
    description: "Create pages in a Notion database",
    icon: Notion,
  },
  {
    type: NodeType.AIRTABLE,
    label: "Airtable",
    description: "Create records in an Airtable base — great for CRM and lead tracking",
    icon: "/logos/airtable.svg",
  },
];

const socialNodes: NodeTypeOption[] = [
  {
    type: NodeType.INSTAGRAM,
    label: "Instagram",
    description: "Publish an image post to your Instagram Business account",
    icon: Meta.Color,
  },
  {
    type: NodeType.FACEBOOK_PAGE,
    label: "Facebook Page",
    description: "Post to a Facebook Page via Meta Graph API",
    icon: Meta.Color,
  },
];

const utilityNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Make any HTTP GET/POST/PUT/DELETE request to an external API",
    icon: GlobeIcon,
  },
  {
    type: NodeType.MCP_TOOL,
    label: "MCP Tool",
    description: "Connect to any MCP server and call its tools — GitHub, HubSpot, Linear, and 700+ more",
    icon: PlugIcon,
  },
];

type NodeGroup = {
  title: string;
  nodes: NodeTypeOption[];
};

const nodeGroups: NodeGroup[] = [
  { title: "Triggers", nodes: triggerNodes },
  { title: "AI", nodes: aiNodes },
  { title: "Communication", nodes: communicationNodes },
  { title: "Google Workspace", nodes: googleNodes },
  { title: "Productivity & CRM", nodes: productivityNodes },
  { title: "Social Media", nodes: socialNodes },
  { title: "Utilities", nodes: utilityNodes },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function NodeItem({ nodeType, onClick }: { nodeType: NodeTypeOption; onClick: () => void }) {
  const Icon = nodeType.icon;
  return (
    <div
      className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary hover:bg-accent/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 w-full overflow-hidden">
        {typeof Icon === "string" ? (
          <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm flex-shrink-0" />
        ) : (
          <Icon size={20} className="flex-shrink-0 text-muted-foreground" />
        )}
        <div className="flex flex-col items-start text-left min-w-0">
          <span className="font-medium text-sm">{nodeType.label}</span>
          <span className="text-xs text-muted-foreground line-clamp-2">{nodeType.description}</span>
        </div>
      </div>
    </div>
  );
}

export function NodeSelector({ open, onOpenChange, children }: NodeSelectorProps) {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();

  const handleNodeSelect = useCallback((selection: NodeTypeOption) => {
    if (selection.type === NodeType.MANUAL_TRIGGER) {
      const nodes = getNodes();
      const hasManualTrigger = nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
      if (hasManualTrigger) {
        toast.error("Only one manual trigger is allowed per workflow");
        return;
      }
    }

    setNodes((nodes) => {
      const hasInitialTrigger = nodes.some((node) => node.type === NodeType.INITIAL);
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const flowPosition = screenToFlowPosition({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
      });
      const newNode = { id: createId(), data: {}, position: flowPosition, type: selection.type };
      return hasInitialTrigger ? [newNode] : [...nodes, newNode];
    });

    onOpenChange(false);
  }, [setNodes, getNodes, onOpenChange, screenToFlowPosition]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a node</SheetTitle>
          <SheetDescription>Select a trigger or action to add to your workflow.</SheetDescription>
        </SheetHeader>
        <div className="mt-2">
          {nodeGroups.map((group, idx) => (
            <div key={group.title}>
              {idx > 0 && <Separator />}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                {group.title}
              </p>
              {group.nodes.map((nodeType) => (
                <NodeItem
                  key={nodeType.type}
                  nodeType={nodeType}
                  onClick={() => handleNodeSelect(nodeType)}
                />
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
