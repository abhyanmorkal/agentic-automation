# Nodebase — Phase 1 Build Document

> **Backend-first approach. Triggers + Webhooks + Messaging. No payments yet.**  
> Every task has a file path, exact pattern to follow, and what to build.

---

## Phase 1 Scope (What We Are Building)

```
TRIGGERS (what starts a workflow)         ACTION NODES (what the workflow does)
─────────────────────────────────         ─────────────────────────────────────
✅ Manual Trigger        (exists)         ✅ HTTP Request         (exists)
✅ Google Form Trigger   (exists)         ✅ OpenAI              (exists)
✅ Stripe Trigger        (exists)         ✅ Anthropic           (exists)
🔨 Generic Webhook                        ✅ Gemini              (exists)
🔨 Facebook Lead Ads                      ✅ Discord             (exists)
🔨 Instagram DM                           ✅ Slack               (exists)
🔨 Instagram Comment                      🔨 WhatsApp Send
🔨 Razorpay Trigger                       🔨 MSG91 SMS
🔨 Schedule (Cron)                        🔨 Google Sheets Write
🔨 WhatsApp Incoming                      🔨 Google Sheets Read
                                          🔨 Email Send (SMTP/Gmail)

LOGIC NODES (control flow)
──────────────────────────
🔨 Conditional (if/else)
🔨 Delay (wait N minutes)
🔨 Transform (reshape data)

PAYMENTS → Phase 2 (Razorpay billing, not trigger — that's Phase 1)
```

---

## How Every Node Is Built (The Pattern)

Study this before writing any code. Every node follows the **exact same 6-file pattern**:

```
For a new trigger called "FACEBOOK_LEAD":

Backend
  1. prisma/schema.prisma          → Add FACEBOOK_LEAD to NodeType enum
  2. src/inngest/channels/         → Create facebook-lead.ts  (realtime channel)
  3. src/features/triggers/.../    → Create executor.ts       (what runs during execution)
  4. src/app/api/webhooks/         → Create route.ts          (HTTP webhook receiver)

Frontend
  5. src/features/triggers/.../    → Create node.tsx          (canvas node card)
  6. src/features/triggers/.../    → Create dialog.tsx        (settings popup)
  7. src/features/triggers/.../    → Create actions.ts        (realtime token server action)

Register
  8. src/config/node-components.ts → Map NodeType → component
  9. src/components/node-selector.tsx → Add to trigger list
 10. src/features/executions/lib/executor-registry.ts → Register executor
 11. src/inngest/functions.ts      → Add channel to executeWorkflow channels[]
```

> **Rule:** Build in this order for every node: Schema → Channel → Webhook Route → Executor → Frontend → Register.

---

## TASK 1 — Generic Webhook Trigger

**What:** Any external system can POST to a URL and trigger a workflow. This is the foundation that Instagram/Facebook/WhatsApp all build on top of.

**Why first:** Facebook, Instagram, WhatsApp, Razorpay all need a webhook receiver. The generic one gives us the pattern.

---

### Task 1.1 — Schema

File: `prisma/schema.prisma`

Add to `NodeType` enum:
```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  GOOGLE_FORM_TRIGGER
  STRIPE_TRIGGER
  WEBHOOK_TRIGGER        // ← ADD THIS
  ANTHROPIC
  GEMINI
  OPENAI
  DISCORD
  SLACK
}
```

Run: `npx prisma migrate dev --name add_webhook_trigger`

---

### Task 1.2 — Inngest Channel

File: `src/inngest/channels/webhook-trigger.ts`

```typescript
import { channel, topic } from "@inngest/realtime";

export const WEBHOOK_TRIGGER_CHANNEL_NAME = "webhook-trigger-execution";

export const webhookTriggerChannel = channel(WEBHOOK_TRIGGER_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
```

---

### Task 1.3 — Webhook Route

File: `src/app/api/webhooks/generic/route.ts`

```typescript
import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflowId");

  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  await sendWorkflowExecution({
    workflowId,
    initialData: {
      webhook: {
        body,
        headers: Object.fromEntries(request.headers.entries()),
        timestamp: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ success: true });
}

// Support GET for verification challenges (Facebook, WhatsApp do this)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ ok: true });
}
```

---

### Task 1.4 — Executor

File: `src/features/triggers/components/webhook-trigger/executor.ts`

```typescript
import type { NodeExecutor } from "@/features/executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";

export const webhookTriggerExecutor: NodeExecutor = async ({
  nodeId, context, step, publish,
}) => {
  await publish(webhookTriggerChannel().status({ nodeId, status: "loading" }));
  const result = await step.run("webhook-trigger", async () => context);
  await publish(webhookTriggerChannel().status({ nodeId, status: "success" }));
  return result;
};
```

---

### Task 1.5 — Realtime Token Action

File: `src/features/triggers/components/webhook-trigger/actions.ts`

```typescript
"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { inngest } from "@/inngest/client";

export type WebhookTriggerToken = Realtime.Token<
  typeof webhookTriggerChannel,
  ["status"]
>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerToken> {
  return getSubscriptionToken(inngest, {
    channel: webhookTriggerChannel(),
    topics: ["status"],
  });
}
```

---

### Task 1.6 — Node UI (Canvas Card)

File: `src/features/triggers/components/webhook-trigger/node.tsx`

Pattern: Copy `stripe-trigger/node.tsx`, change:
- Import `webhookTriggerChannel` / `WebhookTriggerDialog` / `fetchWebhookTriggerRealtimeToken`
- icon: Use Lucide `WebhookIcon`
- name: `"Webhook"`
- description: `"Triggers when an HTTP POST is received"`

---

### Task 1.7 — Dialog UI

File: `src/features/triggers/components/webhook-trigger/dialog.tsx`

Pattern: Copy `stripe-trigger/dialog.tsx`, change:
- Title: `"Webhook Trigger Configuration"`
- Webhook URL: `${baseUrl}/api/webhooks/generic?workflowId=${workflowId}`
- Setup instructions: "Copy the URL, configure it in any external system"
- Available variables:
  - `{{webhook.body}}` — Full POST body
  - `{{webhook.body.email}}` — Specific field from body
  - `{{webhook.timestamp}}` — When it was received

---

### Task 1.8 — Register Everything

```typescript
// src/config/node-components.ts
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
[NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,

// src/components/node-selector.tsx — add to triggerNodes[]
{
  type: NodeType.WEBHOOK_TRIGGER,
  label: "Webhook",
  description: "Triggers when an HTTP POST is received from any external system",
  icon: WebhookIcon,
},

// src/features/executions/lib/executor-registry.ts
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
[NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,

// src/inngest/functions.ts — add to channels[]
import { webhookTriggerChannel } from "./channels/webhook-trigger";
webhookTriggerChannel(),
```

---

## TASK 2 — Facebook Lead Ads Trigger

**What:** Facebook sends a webhook when someone fills a Lead Ad form. We trigger the workflow with that lead's data.

**Why:** The #1 use case for Indian digital marketing agencies.

**Context data structure:**
```json
{
  "facebookLead": {
    "leadgenId": "123456",
    "formId": "789",
    "pageId": "456",
    "adId": "111",
    "createdTime": "2024-01-01T10:00:00Z",
    "fields": [
      { "name": "full_name", "values": ["Rahul Sharma"] },
      { "name": "phone_number", "values": ["+919876543210"] },
      { "name": "email", "values": ["rahul@example.com"] }
    ],
    "name": "Rahul Sharma",
    "phone": "+919876543210",
    "email": "rahul@example.com"
  }
}
```

---

### Task 2.1 — Schema

Add to `NodeType` enum:
```prisma
FACEBOOK_LEAD_TRIGGER    // ← ADD
```

Run: `npx prisma migrate dev --name add_facebook_lead_trigger`

---

### Task 2.2 — Inngest Channel

File: `src/inngest/channels/facebook-lead.ts`

Same pattern as `webhook-trigger.ts`. Channel name: `"facebook-lead-execution"`

---

### Task 2.3 — Webhook Route

File: `src/app/api/webhooks/facebook-lead/route.ts`

**Critical:** Facebook sends a GET verification challenge first, then POSTs lead data.

```typescript
import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

// Facebook verification challenge
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Actual lead data
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflowId");

  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
  }

  const body = await request.json();

  // Facebook sends an array of entries, each with an array of changes
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const leadData = change?.value;

  if (!leadData) {
    return NextResponse.json({ success: true }); // Ignore non-lead events
  }

  // Fetch full lead details using Graph API
  // leadData.leadgen_id gives us the ID to fetch from /v18.0/{leadgen_id}
  const leadFields = await fetchLeadDetails(leadData.leadgen_id);

  const facebookLead = {
    leadgenId: leadData.leadgen_id,
    formId: leadData.form_id,
    pageId: leadData.page_id,
    adId: leadData.ad_id,
    createdTime: leadData.created_time,
    fields: leadFields?.field_data || [],
    // Flatten common fields for easy Handlebars access
    name: getFieldValue(leadFields?.field_data, "full_name"),
    phone: getFieldValue(leadFields?.field_data, "phone_number"),
    email: getFieldValue(leadFields?.field_data, "email"),
  };

  await sendWorkflowExecution({
    workflowId,
    initialData: { facebookLead },
  });

  return NextResponse.json({ success: true });
}

async function fetchLeadDetails(leadgenId: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token || !leadgenId) return null;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${token}`,
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

function getFieldValue(fields: Array<{name: string; values: string[]}> = [], name: string) {
  return fields.find((f) => f.name === name)?.values?.[0] || "";
}
```

---

### Task 2.4 — Executor

File: `src/features/triggers/components/facebook-lead-trigger/executor.ts`

Same pattern as `google-form-trigger/executor.ts`. Just passes context through.

---

### Task 2.5 — Node UI + Dialog

File: `src/features/triggers/components/facebook-lead-trigger/node.tsx`
File: `src/features/triggers/components/facebook-lead-trigger/dialog.tsx`

Dialog shows:
- Webhook URL to paste in Facebook App settings
- Verify Token (from env `FACEBOOK_WEBHOOK_VERIFY_TOKEN`)
- Setup instructions (see below)
- Available variables:
  - `{{facebookLead.name}}` — Lead's full name
  - `{{facebookLead.phone}}` — Phone number
  - `{{facebookLead.email}}` — Email address
  - `{{facebookLead.formId}}` — Which form was submitted
  - `{{json facebookLead.fields}}` — All form fields as JSON

**Setup instructions to show in dialog:**
1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App
2. Add "Leads Access" product
3. Go to Webhooks → Subscribe to `leadgen` events
4. Paste this webhook URL
5. Enter verify token: `{{FACEBOOK_WEBHOOK_VERIFY_TOKEN from .env}}`
6. Add `FACEBOOK_PAGE_ACCESS_TOKEN` to your `.env` (Page token with `leads_retrieval` permission)

---

### Task 2.6 — Add to .env.example

```
FACEBOOK_WEBHOOK_VERIFY_TOKEN="your-custom-verify-token-string"
FACEBOOK_PAGE_ACCESS_TOKEN=""
```

---

### Task 2.7 — Register

Same as Task 1.8 pattern. Register in schema, executor-registry, node-components, node-selector, inngest/functions.ts.

---

## TASK 3 — Instagram DM Trigger + Reply

**What:** Instagram DM arrives → trigger workflow → send reply.

**Architecture note:** Instagram DM automation uses the **same Meta app** as Facebook Lead Ads. Both use Meta Webhooks. One developer app, multiple features.

---

### Task 3.1 — Schema

Add to `NodeType` enum:
```prisma
INSTAGRAM_DM_TRIGGER       // ← ADD (trigger node)
INSTAGRAM_DM_SEND          // ← ADD (action node)
INSTAGRAM_COMMENT_TRIGGER  // ← ADD (trigger node)
INSTAGRAM_COMMENT_REPLY    // ← ADD (action node)
```

Run: `npx prisma migrate dev --name add_instagram_nodes`

---

### Task 3.2 — Webhook Route (Instagram DM + Comment combined)

File: `src/app/api/webhooks/instagram/route.ts`

**Critical:** Meta sends ONE webhook for all Instagram events (DMs, comments, story mentions). We route them based on the event type.

```typescript
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entry = body.entry?.[0];

  if (!entry) return NextResponse.json({ success: true });

  // ── DM (messaging) events ──
  const messaging = entry.messaging?.[0];
  if (messaging?.message && !messaging.message.is_echo) {
    const igData = {
      senderId: messaging.sender.id,
      recipientId: messaging.recipient.id,
      messageId: messaging.message.mid,
      text: messaging.message.text,
      timestamp: messaging.timestamp,
    };

    // Find all workflows that use INSTAGRAM_DM_TRIGGER
    // We look up by the Instagram Page ID stored in node data
    await triggerMatchingWorkflows(NodeType.INSTAGRAM_DM_TRIGGER, entry.id, {
      instagramDm: igData,
    });
  }

  // ── Comment events ──
  const comment = entry.changes?.find((c: any) => c.field === "comments");
  if (comment) {
    const commentData = {
      commentId: comment.value.id,
      postId: comment.value.media?.id,
      from: comment.value.from,
      text: comment.value.text,
      timestamp: comment.value.timestamp,
    };

    await triggerMatchingWorkflows(NodeType.INSTAGRAM_COMMENT_TRIGGER, entry.id, {
      instagramComment: commentData,
    });
  }

  return NextResponse.json({ success: true });
}

// Find workflows using this trigger type that are linked to this Instagram page ID
async function triggerMatchingWorkflows(
  nodeType: NodeType,
  pageId: string,
  initialData: object,
) {
  // Find all nodes of this type where data.pageId matches
  const nodes = await prisma.node.findMany({
    where: {
      type: nodeType,
      data: { path: ["pageId"], equals: pageId },
    },
    select: { workflowId: true },
  });

  await Promise.all(
    nodes.map((node) =>
      sendWorkflowExecution({ workflowId: node.workflowId, initialData }),
    ),
  );
}
```

> **Note:** `triggerMatchingWorkflows` is the pattern we'll reuse for ALL multi-workflow triggers (Instagram, WhatsApp). The node stores `pageId` / `accountId` in its `data` field, and we find all workflows subscribed to that account.

---

### Task 3.3 — Instagram DM Send Executor (Action Node)

File: `src/features/executions/components/instagram-dm-send/executor.ts`

```typescript
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { instagramDmSendChannel } from "@/inngest/channels/instagram-dm-send";

type InstagramDmSendData = {
  variableName?: string;
  recipientId?: string;  // Can be Handlebars: {{instagramDm.senderId}}
  message?: string;
  pageAccessToken?: string; // Store in env or credential
};

export const instagramDmSendExecutor: NodeExecutor<InstagramDmSendData> = async ({
  data, nodeId, context, step, publish,
}) => {
  await publish(instagramDmSendChannel().status({ nodeId, status: "loading" }));

  if (!data.message) throw new NonRetriableError("Instagram DM Send: message is required");
  if (!data.recipientId) throw new NonRetriableError("Instagram DM Send: recipientId is required");

  const message = Handlebars.compile(data.message)(context);
  const recipientId = Handlebars.compile(data.recipientId)(context);
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;

  if (!token) throw new NonRetriableError("INSTAGRAM_PAGE_ACCESS_TOKEN not set");

  const result = await step.run("instagram-dm-send", async () => {
    await ky.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        json: {
          recipient: { id: recipientId },
          message: { text: message.slice(0, 1000) }, // IG limit
          messaging_type: "RESPONSE",
          access_token: token,
        },
      },
    );

    if (!data.variableName) throw new NonRetriableError("Instagram DM Send: variableName required");

    return {
      ...context,
      [data.variableName]: { sent: true, recipientId, message },
    };
  });

  await publish(instagramDmSendChannel().status({ nodeId, status: "success" }));
  return result;
};
```

---

### Task 3.4 — Instagram Comment Reply Executor

File: `src/features/executions/components/instagram-comment-reply/executor.ts`

Same pattern as DM send, but POST to `/v18.0/{commentId}/replies`.

```typescript
// Key difference — the API call:
await ky.post(
  `https://graph.facebook.com/v18.0/${commentId}/replies`,
  {
    json: {
      message: replyText,
      access_token: token,
    },
  },
);
```

---

### Task 3.5 — New env vars

Add to `.env.example`:
```
INSTAGRAM_WEBHOOK_VERIFY_TOKEN="your-custom-verify-token"
INSTAGRAM_PAGE_ACCESS_TOKEN=""
```

---

### Task 3.6 — Dialog UI (DM Trigger)

Shows:
- Webhook URL: `${baseUrl}/api/webhooks/instagram?workflowId=...`
  - **Note:** Instagram DM trigger doesn't need workflowId in URL — it routes by pageId stored in node data
  - URL is just: `${baseUrl}/api/webhooks/instagram`
- Input field: "Instagram Page ID" (stored in node data, used to match workflows)
- Verify token
- Setup instructions:
  1. developers.facebook.com → Your App → Add Instagram product
  2. Go to Webhooks → Subscribe to `messages` events
  3. Paste webhook URL, enter verify token
  4. Get Page Access Token with `instagram_manage_messages` permission

Available variables (DM trigger):
- `{{instagramDm.text}}` — Message text
- `{{instagramDm.senderId}}` — Sender's Instagram user ID (use this as recipientId for replies)
- `{{instagramDm.timestamp}}` — When message was sent

Available variables (Comment trigger):
- `{{instagramComment.text}}` — Comment text
- `{{instagramComment.from.name}}` — Commenter's name
- `{{instagramComment.commentId}}` — Comment ID (use for reply)
- `{{instagramComment.postId}}` — Which post was commented on

---

## TASK 4 — WhatsApp Trigger + Send

**What:** WhatsApp Business message arrives → trigger workflow → send reply.

**Provider:** Meta Cloud API (same developer app as Facebook + Instagram)

---

### Task 4.1 — Schema

```prisma
WHATSAPP_TRIGGER   // ← ADD
WHATSAPP_SEND      // ← ADD
```

---

### Task 4.2 — Webhook Route

File: `src/app/api/webhooks/whatsapp/route.ts`

Meta sends WhatsApp webhooks in a specific structure. **Important: Must return 200 immediately or Meta retries.**

```typescript
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "server/server";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
  ) {
    return new Response(url.searchParams.get("hub.challenge")!, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  // Always return 200 immediately — process async
  const body = await request.json();

  // Process in background, don't await
  handleWhatsAppWebhook(body).catch(console.error);

  return NextResponse.json({ success: true });
}

async function handleWhatsAppWebhook(body: any) {
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value?.messages) return; // Not a message event (could be status update)

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  const whatsappData = {
    messageId: message.id,
    from: message.from,           // Phone number e.g. "919876543210"
    name: contact?.profile?.name, // Contact name
    type: message.type,           // "text", "image", "audio", etc.
    text: message.text?.body,     // Message text (if type is "text")
    timestamp: message.timestamp,
    phoneNumberId: value.metadata?.phone_number_id,
    displayPhoneNumber: value.metadata?.display_phone_number,
  };

  // Find all workflows using WHATSAPP_TRIGGER
  const nodes = await prisma.node.findMany({
    where: {
      type: NodeType.WHATSAPP_TRIGGER,
      data: { path: ["phoneNumberId"], equals: whatsappData.phoneNumberId },
    },
    select: { workflowId: true },
  });

  await Promise.all(
    nodes.map((node) =>
      sendWorkflowExecution({
        workflowId: node.workflowId,
        initialData: { whatsapp: whatsappData },
      }),
    ),
  );
}
```

---

### Task 4.3 — WhatsApp Send Executor

File: `src/features/executions/components/whatsapp-send/executor.ts`

```typescript
type WhatsAppSendData = {
  variableName?: string;
  to?: string;        // Handlebars: {{whatsapp.from}} for replies
  message?: string;  // Handlebars supported
  phoneNumberId?: string; // Your WhatsApp Business phone number ID
};

// API call inside step.run:
await ky.post(
  `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
  {
    json: {
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "text",
      text: { body: message.slice(0, 4096) },
    },
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
  },
);
```

**For template messages** (for first-contact, not replies):
```typescript
// Template message structure
{
  messaging_product: "whatsapp",
  to: recipientPhone,
  type: "template",
  template: {
    name: "hello_world",   // approved template name
    language: { code: "en_US" },
    components: [...]
  }
}
```

---

### Task 4.4 — New env vars

```
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your-custom-token"
WHATSAPP_ACCESS_TOKEN=""         # System user token from Meta Business
WHATSAPP_PHONE_NUMBER_ID=""      # From WhatsApp Business API setup
```

---

### Task 4.5 — Dialog UI (WhatsApp Trigger)

Available variables:
- `{{whatsapp.text}}` — Incoming message text
- `{{whatsapp.from}}` — Sender's phone number (use for reply `to` field)
- `{{whatsapp.name}}` — Sender's WhatsApp display name
- `{{whatsapp.type}}` — Message type (text, image, etc.)
- `{{whatsapp.timestamp}}` — Message timestamp

Setup instructions:
1. Meta for Developers → Create App → Business type
2. Add WhatsApp product
3. Go to WhatsApp → Configuration → Webhook
4. Paste webhook URL, enter verify token
5. Subscribe to `messages` webhook field
6. Get System User Access Token with `whatsapp_business_messaging` permission
7. Copy Phone Number ID from WhatsApp → API Setup

---

## TASK 5 — Schedule / Cron Trigger

**What:** Run a workflow automatically on a schedule (every day at 9 AM, every Monday, etc.)

**Tech:** Inngest has built-in cron support via `crons` parameter. No webhook needed.

---

### Task 5.1 — Schema

```prisma
SCHEDULE_TRIGGER  // ← ADD
```

---

### Task 5.2 — No Webhook Route Needed

Inngest handles scheduling. Instead, we register a separate Inngest function with a cron expression.

File: `src/inngest/functions.ts` — Add below `executeWorkflow`:

```typescript
export const executeScheduledWorkflows = inngest.createFunction(
  { id: "execute-scheduled-workflows" },
  { cron: "* * * * *" },  // Runs every minute, checks which workflows are due
  async ({ step }) => {
    // Find all nodes of type SCHEDULE_TRIGGER that are due to run
    const dueWorkflows = await step.run("find-due-workflows", async () => {
      return prisma.node.findMany({
        where: {
          type: NodeType.SCHEDULE_TRIGGER,
          // Check data.nextRunAt <= now
        },
        select: { workflowId: true, data: true },
      });
    });

    // Send execution event for each due workflow
    for (const workflow of dueWorkflows) {
      await sendWorkflowExecution({
        workflowId: workflow.workflowId,
        initialData: { schedule: { triggeredAt: new Date().toISOString() } },
      });
    }
  }
);
```

> **Simpler approach:** Store `cronExpression` and `nextRunAt` in node `data`. The cron function runs every minute and checks `nextRunAt`. After triggering, update `nextRunAt` using a cron parser.

---

### Task 5.3 — Dialog UI (Schedule Trigger)

Visual cron builder with options:
- Every N minutes / hours
- Daily at a specific time (IST)
- Weekly on specific days
- Monthly on specific dates
- Custom cron expression (advanced)

---

## TASK 6 — Action Nodes (Messaging)

### Task 6.1 — WhatsApp Send (covered in Task 4.3 above)

### Task 6.2 — MSG91 SMS Send

File: `src/features/executions/components/msg91-sms/executor.ts`

```typescript
type Msg91Data = {
  variableName?: string;
  to?: string;        // Phone number with country code
  message?: string;  // Handlebars supported
  senderId?: string; // e.g. "NODEBS"
};

// API call:
await ky.post("https://api.msg91.com/api/v5/flow/", {
  json: {
    template_id: data.templateId,
    short_url: "0",
    mobiles: phone,
    VAR1: message,
  },
  headers: {
    authkey: process.env.MSG91_AUTH_KEY,
    "Content-Type": "application/json",
  },
});
```

New env: `MSG91_AUTH_KEY=""`

---

### Task 6.3 — Google Sheets Write

File: `src/features/executions/components/google-sheets-write/executor.ts`

Uses Google Sheets API v4.

```typescript
type GoogleSheetsWriteData = {
  variableName?: string;
  spreadsheetId?: string;  // From the sheet URL
  range?: string;          // e.g. "Sheet1!A:Z"
  values?: string;         // JSON array string, Handlebars supported
                            // e.g. [["{{lead.name}}", "{{lead.email}}", "{{lead.phone}}"]]
};

// Needs credential type: GOOGLE_OAUTH (OAuth2 token)
// OR use a service account JSON key

// API call:
await ky.post(
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
  {
    json: {
      range,
      majorDimension: "ROWS",
      values: JSON.parse(Handlebars.compile(data.values)(context)),
    },
    searchParams: { valueInputOption: "USER_ENTERED" },
    headers: { Authorization: `Bearer ${accessToken}` },
  },
);
```

> **Credential approach:** Add `GOOGLE_SHEETS` to `CredentialType` enum. Store the OAuth refresh token encrypted. The executor decrypts and exchanges it for an access token before the API call.

---

### Task 6.4 — Email Send (SMTP)

File: `src/features/executions/components/email-send/executor.ts`

Use `nodemailer` package.

```typescript
type EmailSendData = {
  variableName?: string;
  to?: string;      // Handlebars
  subject?: string; // Handlebars
  body?: string;    // Handlebars (HTML supported)
  credentialId?: string; // SMTP credential
};

// Add SMTP to CredentialType:
// SMTP → stores JSON: { host, port, user, pass }
```

---

## TASK 7 — Logic Nodes

### Task 7.1 — CONDITIONAL Node (If / Else)

**What:** Routes workflow to different branches based on a condition.

**Schema:**
```prisma
CONDITIONAL  // ← ADD
```

**Design:**
- Node has TWO output handles: `true` and `false` (instead of the default `main`)
- Condition is a simple expression: `{{lead.score}} >= 7`
- Uses a safe evaluator (not `eval`)

```typescript
type ConditionalData = {
  condition?: string;  // e.g. "{{aiScore.score}} >= 7"
};

// Executor evaluates the condition against context
// Returns context with added field: conditional: { result: true/false }
// The "true" output handle connects to the success branch
// The "false" output handle connects to the failure branch

// NOTE: This requires changes to the topological sort and execution engine
// to support branching. Nodes after a CONDITIONAL need to know which branch they're on.
```

> **Implementation note:** CONDITIONAL requires the execution engine in `src/inngest/functions.ts` to be enhanced to support branching. When a CONDITIONAL node runs, the engine skips nodes on the branch that doesn't match. Mark this as a **Phase 1 stretch goal** — implement after all other nodes are done.

---

### Task 7.2 — DELAY Node

**What:** Wait N minutes/hours before executing the next node.

**Tech:** Inngest has `step.sleep` built in.

```typescript
type DelayData = {
  duration?: number;  // e.g. 30
  unit?: "minutes" | "hours" | "days";
};

export const delayExecutor: NodeExecutor<DelayData> = async ({
  data, step, context,
}) => {
  const ms = (data.duration || 1) * {
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
  }[data.unit || "minutes"];

  await step.sleep(`delay-${data.duration}-${data.unit}`, ms);
  return context;
};
```

---

### Task 7.3 — TRANSFORM Node

**What:** Reshape context data using a simple mapping. No AI, no HTTP — pure data manipulation.

```typescript
type TransformData = {
  variableName?: string;
  mapping?: string;  // JSON string with Handlebars, e.g.:
  // {
  //   "customerName": "{{facebookLead.name}}",
  //   "customerPhone": "{{facebookLead.phone}}",
  //   "source": "facebook"
  // }
};

// Executor compiles mapping as Handlebars, parses result as JSON, adds to context
const compiled = Handlebars.compile(data.mapping)(context);
const transformed = JSON.parse(compiled);
return { ...context, [data.variableName]: transformed };
```

---

## File Creation Order (Exact Sequence)

Build in this exact sequence. Each step depends on the previous.

```
WEEK 1 — Backend (no UI)
─────────────────────────
Day 1:  Task 1 — Generic Webhook (schema, channel, route, executor)
Day 2:  Task 2 — Facebook Lead (schema, channel, route, executor)
Day 3:  Task 3 — Instagram DM + Comment (schema, channels, routes, executors)
Day 4:  Task 4 — WhatsApp (schema, channel, route, executors - send + trigger)
Day 5:  Task 5 — Schedule/Cron (schema, inngest cron function)
        Task 6 — MSG91, Google Sheets, Email executors (backend only)
        Task 7 — Delay, Transform executors

WEEK 2 — Frontend (node cards + dialogs)
────────────────────────────────────────
Day 6:  Generic Webhook + Facebook Lead → node.tsx + dialog.tsx
Day 7:  Instagram DM + Comment → node.tsx + dialog.tsx
Day 8:  WhatsApp → node.tsx + dialog.tsx (trigger + send)
Day 9:  MSG91 + Google Sheets + Email → node.tsx + dialog.tsx
Day 10: Schedule → node.tsx + dialog.tsx (visual cron builder)

WEEK 3 — Logic Nodes + Register + Test
───────────────────────────────────────
Day 11: Delay + Transform → node.tsx + dialog.tsx
Day 12: Register ALL nodes in node-components, node-selector, executor-registry
Day 13: Update prisma schema enum, run migrations
Day 14: End-to-end test each flow
Day 15: Fix bugs, polish dialogs, update DOCS.md
```

---

## Prisma Migration Plan (All at Once)

Run one migration with all new node types:

```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  GOOGLE_FORM_TRIGGER
  STRIPE_TRIGGER

  // Phase 1 — Triggers
  WEBHOOK_TRIGGER
  FACEBOOK_LEAD_TRIGGER
  INSTAGRAM_DM_TRIGGER
  INSTAGRAM_COMMENT_TRIGGER
  WHATSAPP_TRIGGER
  SCHEDULE_TRIGGER

  // Phase 1 — Action nodes
  WHATSAPP_SEND
  INSTAGRAM_DM_SEND
  INSTAGRAM_COMMENT_REPLY
  MSG91_SMS
  GOOGLE_SHEETS_WRITE
  GOOGLE_SHEETS_READ
  EMAIL_SEND

  // Phase 1 — Logic nodes
  CONDITIONAL
  DELAY
  TRANSFORM

  // Existing action nodes
  ANTHROPIC
  GEMINI
  OPENAI
  DISCORD
  SLACK
}
```

Add new credential type:
```prisma
enum CredentialType {
  OPENAI
  ANTHROPIC
  GEMINI
  GOOGLE_SHEETS  // ← ADD (OAuth refresh token for Sheets)
  SMTP           // ← ADD (host, port, user, pass as JSON)
}
```

---

## New Environment Variables (Phase 1)

Add all to `.env.example`:

```env
# ─────────────────────────────────────────────
# Meta / Facebook / Instagram / WhatsApp
# ─────────────────────────────────────────────
FACEBOOK_WEBHOOK_VERIFY_TOKEN="set-any-random-string-you-choose"
FACEBOOK_PAGE_ACCESS_TOKEN=""      # From Meta Business → Page → Access Token

INSTAGRAM_WEBHOOK_VERIFY_TOKEN="set-any-random-string-you-choose"
INSTAGRAM_PAGE_ACCESS_TOKEN=""     # Same token if using same Meta app

WHATSAPP_WEBHOOK_VERIFY_TOKEN="set-any-random-string-you-choose"
WHATSAPP_ACCESS_TOKEN=""           # System user token from Meta Business Manager
WHATSAPP_PHONE_NUMBER_ID=""        # From WhatsApp API Setup page

# ─────────────────────────────────────────────
# SMS
# ─────────────────────────────────────────────
MSG91_AUTH_KEY=""                  # From MSG91 dashboard

# ─────────────────────────────────────────────
# Inngest (production only)
# ─────────────────────────────────────────────
INNGEST_EVENT_KEY=""               # From Inngest dashboard
INNGEST_SIGNING_KEY=""             # From Inngest dashboard
```

---

## What Phase 2 Will Cover

```
Phase 2 — Payments + CRM + Agency
────────────────────────────────────
🔨 Razorpay Trigger (payment events)
🔨 Razorpay Action (create payment link)
🔨 LeadSquared CRM node
🔨 Zoho CRM node
🔨 Organizations / Workspaces (multi-tenant)
🔨 Team members + roles
🔨 Workflow templates library
🔨 White-label mode

Phase 3 — Advanced AI + Scale
────────────────────────────────
🔨 AI Filter node
🔨 AI Classify node
🔨 AI Extract node
🔨 CONDITIONAL branching engine (if deferred from Phase 1)
🔨 Loop node
🔨 Connection pooling + rate limiting
🔨 Execution replay
🔨 Webhook history UI
```

---

## Testing Checklist Per Node

Before marking any node done, verify:

```
□ Migration ran cleanly (npx prisma migrate dev)
□ Channel file created in src/inngest/channels/
□ Executor registered in executor-registry.ts
□ Channel registered in inngest/functions.ts channels[]
□ Webhook route returns 200 for valid POST
□ Webhook route handles GET verification (if applicable)
□ Initial data appears in context correctly
□ Handlebars variables work in downstream nodes
□ Node card renders on canvas
□ Dialog opens on double-click
□ Webhook URL shown correctly in dialog
□ Setup instructions are clear
□ Real-time status indicator works (loading → success / error)
□ Execution shows in history after run
```

---

*Phase 1 Build Document — Nodebase | March 2026*
