# Nodebase — Complete Documentation

> A visual no-code workflow automation platform for small agencies and freelancers.  
> Built with Next.js 15, tRPC, Prisma, Inngest, and AI (OpenAI, Anthropic, Gemini).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Database](#6-database)
7. [Authentication](#7-authentication)
8. [Workflow System](#8-workflow-system)
9. [Node Reference](#9-node-reference)
10. [Credentials System](#10-credentials-system)
11. [Execution Engine](#11-execution-engine)
12. [API Reference](#12-api-reference)
13. [Billing & Subscriptions](#13-billing--subscriptions)
14. [Real-time Updates](#14-real-time-updates)
15. [Error Monitoring](#15-error-monitoring)
16. [Use Cases & Agency Scenarios](#16-use-cases--agency-scenarios)
17. [Scalability Guide](#17-scalability-guide)
18. [Roadmap](#18-roadmap)
19. [Adding a New Node](#19-adding-a-new-node)
20. [Deployment](#20-deployment)

---

## 1. Project Overview

Nodebase is a **visual workflow automation builder**. Users design automation workflows on a drag-and-drop canvas. Each workflow is a directed graph of **nodes** (trigger + action steps). When a workflow runs, each node executes in topological order, passing data (context) from one node to the next.

**Primary audience:** Small marketing agencies, freelancers, and solopreneurs who want to automate repetitive tasks involving forms, payments, AI, and messaging — without writing code.

**Core loop:**

```
Trigger fires → Inngest background job starts → Nodes execute in order → Result stored → User sees live status
```

---

## 2. Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5, strict mode |
| UI | React 19, Radix UI, Tailwind CSS 4, shadcn-style components |
| State (client) | Jotai (editor atoms), TanStack Query (server state) |
| API layer | tRPC 11 + superjson |
| Database ORM | Prisma 6 |
| Database | PostgreSQL (Neon recommended) |
| Background jobs | Inngest 3 |
| Real-time | @inngest/realtime (pub/sub channels) |
| Auth | Better Auth 1 |
| Billing | Polar.sh |
| AI | Vercel AI SDK + OpenAI (GPT-4), Anthropic (Claude Sonnet), Google (Gemini 2.0 Flash) |
| Canvas | @xyflow/react (React Flow) |
| Monitoring | Sentry |
| Linter/Formatter | Biome 2 |

---

## 3. Project Structure

```
nodebase-main/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # SQL migration history
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, signup pages
│   │   ├── (dashboard)/        # Protected app pages
│   │   │   ├── (editor)/       # Workflow canvas editor
│   │   │   └── (rest)/         # Workflows, credentials, executions lists
│   │   └── api/
│   │       ├── auth/           # Better Auth handler
│   │       ├── inngest/        # Inngest job handler
│   │       ├── trpc/           # tRPC handler
│   │       └── webhooks/
│   │           ├── stripe/     # Stripe webhook receiver
│   │           └── google-form/ # Google Form webhook receiver
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # Radix-based primitives
│   │   └── react-flow/         # Canvas node base components
│   ├── config/                 # Constants, node registry
│   ├── features/               # Feature-sliced modules
│   │   ├── auth/               # Login/register forms
│   │   ├── credentials/        # Credential CRUD + encryption
│   │   ├── editor/             # Canvas editor store + UI
│   │   ├── executions/         # Execution history + node executors
│   │   │   └── components/
│   │   │       ├── anthropic/  # Anthropic node
│   │   │       ├── discord/    # Discord node
│   │   │       ├── gemini/     # Gemini node
│   │   │       ├── http-request/ # HTTP Request node
│   │   │       ├── openai/     # OpenAI node
│   │   │       └── slack/      # Slack node
│   │   ├── subscriptions/      # Polar subscription hooks
│   │   ├── triggers/           # Trigger node UI + executors
│   │   │   └── components/
│   │   │       ├── google-form-trigger/
│   │   │       ├── manual-trigger/
│   │   │       └── stripe-trigger/
│   │   └── workflows/          # Workflow CRUD + list UI
│   ├── generated/
│   │   └── prisma/             # Auto-generated Prisma client
│   ├── hooks/                  # Shared React hooks
│   ├── inngest/
│   │   ├── client.ts           # Inngest client
│   │   ├── functions.ts        # executeWorkflow function
│   │   ├── channels/           # Realtime pub/sub channels per node type
│   │   └── utils.ts            # sendWorkflowExecution helper
│   ├── lib/
│   │   ├── auth.ts             # Better Auth config
│   │   ├── auth-client.ts      # Client-side auth helpers
│   │   ├── auth-utils.ts       # Server-side session helpers
│   │   ├── db.ts               # Prisma singleton
│   │   ├── encryption.ts       # Cryptr encrypt/decrypt
│   │   └── polar.ts            # Polar SDK client
│   └── trpc/
│       ├── client.tsx          # TanStack + tRPC client setup
│       ├── init.ts             # tRPC router, procedures, middleware
│       ├── query-client.ts     # TanStack Query config
│       ├── routers/_app.ts     # Root router
│       └── server.tsx          # Server-side tRPC caller
├── .env.example                # All required env vars documented
├── DOCS.md                     # This file
├── biome.json                  # Linter/formatter config
├── mprocs.yaml                 # Dev multi-process config
├── next.config.ts              # Next.js + Sentry config
└── tsconfig.json               # TypeScript config
```

---

## 4. Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL database (local or hosted)
- Inngest account (or use Inngest dev server locally)

### Installation

```bash
# 1. Clone and install
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Set up environment
cp .env.example .env
# → Fill in DATABASE_URL and ENCRYPTION_KEY at minimum

# 4. Run database migrations
npx prisma migrate dev

# 5. Start development server
npm run dev
```

### Development with all services

To run Next.js + Inngest dev server + ngrok simultaneously:

```bash
# Fill NGROK_URL in .env first
npm run dev:all
```

This uses `mprocs` to run all three processes in parallel.

### Individual scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Next.js with Turbopack |
| Build | `npm run build` | Production build |
| Start | `npm run start` | Production server |
| Lint | `npx @biomejs/biome check` | Biome linter |
| Format | `npm run format` | Biome formatter |
| Inngest | `npm run inngest:dev` | Inngest local dev server |
| Ngrok | `npm run ngrok:dev` | Expose localhost via ngrok |
| All-in-one | `npm run dev:all` | All three above |

---

## 5. Environment Variables

Copy `.env.example` to `.env` and fill in the values.

### Required

| Variable | Description | How to get |
|----------|-------------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | Create DB on [neon.tech](https://neon.tech) |
| `ENCRYPTION_KEY` | Secret for encrypting API credentials | `openssl rand -base64 32` |

### Optional (app breaks gracefully without these in dev)

| Variable | Description | How to get |
|----------|-------------|-----------|
| `NEXT_PUBLIC_APP_URL` | Base URL (for webhooks, OAuth) | `http://localhost:3000` in dev |
| `GITHUB_CLIENT_ID` | GitHub OAuth app ID | [github.com/settings/developers](https://github.com/settings/developers) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | Same as above |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Same as above |
| `POLAR_ACCESS_TOKEN` | Polar API token (enables billing) | [polar.sh](https://polar.sh/dashboard) |
| `POLAR_SUCCESS_URL` | Redirect after successful checkout | `http://localhost:3000/workflows` |
| `NGROK_URL` | Ngrok reserved domain | [ngrok.com](https://ngrok.com) |

> **Note:** When `POLAR_ACCESS_TOKEN` is not set, the Polar billing plugin is skipped. The `premiumProcedure` will allow all authenticated users to create workflows (no subscription check).

---

## 6. Database

### Schema Overview

```
User
 ├── Sessions
 ├── Accounts (OAuth providers)
 ├── Credentials (encrypted API keys)
 └── Workflows
      ├── Nodes (visual nodes on the canvas)
      ├── Connections (edges between nodes)
      └── Executions (run history)

Verification (email verification tokens)
```

### Key models

**Workflow** — Belongs to a user. Contains nodes and connections.

**Node** — One step in a workflow. Has a `type` (e.g. `SLACK`, `OPENAI`), a `position` on the canvas, and a `data` JSON blob (the node's configuration).

**Connection** — An edge from one node's output to another node's input.

**Execution** — A record of a workflow run. Stores `status` (`RUNNING`, `SUCCESS`, `FAILED`), error info, `inngestEventId`, and the final output JSON.

**Credential** — An encrypted API key (OpenAI, Anthropic, or Gemini). Stored as `encrypt(apiKey)` using Cryptr and `ENCRYPTION_KEY`.

### Node types

```typescript
enum NodeType {
  INITIAL           // Default starting node
  MANUAL_TRIGGER    // Run manually via button
  HTTP_REQUEST      // Make HTTP API calls
  GOOGLE_FORM_TRIGGER // Triggered by Google Form submission
  STRIPE_TRIGGER    // Triggered by Stripe webhook
  ANTHROPIC         // Claude AI text generation
  GEMINI            // Gemini AI text generation
  OPENAI            // GPT-4 text generation
  DISCORD           // Post message to Discord
  SLACK             // Post message to Slack
}
```

### Commands

```bash
# Apply migrations (dev)
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Regenerate Prisma client (after schema changes)
npx prisma generate

# Open Prisma Studio (DB GUI)
npx prisma studio
```

---

## 7. Authentication

Built with [Better Auth](https://better-auth.com).

### Methods

| Method | Enabled | Requires |
|--------|---------|---------|
| Email + Password | Always | Nothing extra |
| GitHub OAuth | When `GITHUB_CLIENT_ID` is set | GitHub app |
| Google OAuth | When `GOOGLE_CLIENT_ID` is set | Google project |

### Password rules

- Minimum 6 characters in development
- Minimum 8 characters in production

### Session handling

Sessions are stored in the `session` table in PostgreSQL. Better Auth manages session cookies automatically.

### Server-side session access

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```

### Client-side session access

```typescript
import { authClient } from "@/lib/auth-client";

const { data: session } = authClient.useSession();
```

---

## 8. Workflow System

### How workflows work

1. User creates a workflow on the canvas.
2. User drags nodes onto the canvas and connects them.
3. User clicks **Execute** (or a webhook fires).
4. The app sends an `inngest` event: `workflows/execute.workflow`.
5. Inngest picks up the event and runs `executeWorkflow` as a background job.
6. Nodes are sorted topologically (respects connection order).
7. Each node's executor runs in sequence, passing a shared **context** object forward.
8. The execution record is updated to `SUCCESS` or `FAILED`.
9. The UI shows live status via Inngest realtime channels.

### Context object

The **context** is a plain JavaScript object passed from node to node. Each node reads from it and adds its own output under its `variableName` key.

```json
{
  "googleForm": {
    "formId": "...",
    "responses": [...],
    "respondentEmail": "user@example.com"
  },
  "aiResult": {
    "text": "Lead quality score: 8/10. Recommended action: Follow up."
  },
  "slackMessage": {
    "messageContent": "New lead scored 8/10 — follow up recommended."
  }
}
```

### Handlebars templating

All text fields in nodes (prompts, message content, URLs, bodies) support **Handlebars** templates. You can reference any context value:

```handlebars
New form submission from {{googleForm.respondentEmail}}

Responses: {{json googleForm.responses}}

AI analysis: {{aiResult.text}}
```

The `{{json value}}` helper formats any value as pretty-printed JSON.

---

## 9. Node Reference

### Trigger Nodes

Trigger nodes start a workflow. They appear first in the graph and populate the initial context.

---

#### MANUAL_TRIGGER

Runs the workflow immediately when the user clicks **Execute** in the editor.

- **Context output:** No initial data (empty context).
- **Use case:** Testing, on-demand runs.

---

#### GOOGLE_FORM_TRIGGER

Triggered when a Google Form is submitted via webhook.

**Webhook URL:**
```
POST {NEXT_PUBLIC_APP_URL}/api/webhooks/google-form?workflowId={workflowId}
```

**Context populated:**
```json
{
  "googleForm": {
    "formId": "1FAIpQLSd...",
    "formTitle": "Contact Form",
    "responseId": "ACYDBNj...",
    "timestamp": "2024-01-01T10:00:00Z",
    "respondentEmail": "user@example.com",
    "responses": [...],
    "raw": { ...full payload... }
  }
}
```

**Setup:**
1. In Google Apps Script, set up a form submit trigger that POSTs to the webhook URL.
2. Copy the webhook URL from the node's dialog.
3. Paste into your Apps Script.

---

#### STRIPE_TRIGGER

Triggered when Stripe sends a webhook event (e.g. payment succeeded).

**Webhook URL:**
```
POST {NEXT_PUBLIC_APP_URL}/api/webhooks/stripe?workflowId={workflowId}
```

**Context populated:**
```json
{
  "stripe": {
    "eventId": "evt_...",
    "eventType": "payment_intent.succeeded",
    "timestamp": 1700000000,
    "livemode": true,
    "raw": { ...Stripe data object... }
  }
}
```

**Setup:**
1. In Stripe Dashboard → Webhooks → Add endpoint.
2. Set the URL to the webhook URL from the node dialog.
3. Select which events to listen to.

---

### Action Nodes

Action nodes receive context, do something, and return the updated context.

---

#### HTTP_REQUEST

Makes an HTTP API call.

**Configuration:**

| Field | Description |
|-------|-------------|
| Variable Name | Key to store the response under in context |
| Endpoint | URL (supports Handlebars) |
| Method | GET, POST, PUT, PATCH, DELETE |
| Body | JSON body (supports Handlebars, POST/PUT/PATCH only) |

**Context output:**
```json
{
  "myApiResult": {
    "httpResponse": {
      "status": 200,
      "statusText": "OK",
      "data": { ...response body... }
    }
  }
}
```

**Example — write to Google Sheets via Apps Script web app:**
```
Endpoint: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
Method: POST
Body: { "email": "{{googleForm.respondentEmail}}", "score": "{{aiResult.text}}" }
```

---

#### ANTHROPIC

Generates text using Claude Sonnet (Anthropic).

**Requires:** An Anthropic credential (API key) saved in Credentials.

| Field | Description |
|-------|-------------|
| Variable Name | Key to store AI output in context |
| Credential | Select saved Anthropic API key |
| System Prompt | Instructions for the AI (supports Handlebars) |
| User Prompt | The main prompt (supports Handlebars) |

**Context output:**
```json
{
  "myAiResult": {
    "text": "Generated text from Claude..."
  }
}
```

**Example prompt:**
```
Score this lead from 1-10 and explain:
Name: {{googleForm.responses.0.answer}}
Email: {{googleForm.respondentEmail}}
Message: {{googleForm.responses.1.answer}}
```

---

#### OPENAI

Generates text using GPT-4 (OpenAI).

Same fields and output structure as the Anthropic node.

**Requires:** An OpenAI credential.

---

#### GEMINI

Generates text using Gemini 2.0 Flash (Google).

Same fields and output structure as the Anthropic node.

**Requires:** A Gemini credential.

---

#### DISCORD

Posts a message to a Discord channel via webhook.

**Configuration:**

| Field | Description |
|-------|-------------|
| Variable Name | Key to store result in context |
| Webhook URL | Discord channel webhook URL |
| Message Content | Message text (supports Handlebars) |
| Username | Optional custom bot username |

**Context output:**
```json
{
  "discordResult": {
    "messageContent": "The message that was sent..."
  }
}
```

**Note:** Discord messages are capped at 2000 characters.

**Setup:**
1. Discord server → Channel settings → Integrations → Webhooks → New Webhook.
2. Copy URL → paste into node config.

---

#### SLACK

Posts a message to a Slack channel via incoming webhook.

**Configuration:**

| Field | Description |
|-------|-------------|
| Variable Name | Key to store result in context |
| Webhook URL | Slack incoming webhook URL |
| Message Content | Message text (supports Handlebars) |

**Context output:**
```json
{
  "slackResult": {
    "messageContent": "The message that was sent..."
  }
}
```

**Setup:**
1. [api.slack.com/apps](https://api.slack.com/apps) → Create app → Incoming Webhooks.
2. Enable → Add to workspace → Copy webhook URL.

---

## 10. Credentials System

Credentials store API keys for AI nodes (OpenAI, Anthropic, Gemini) securely.

### Storage

API keys are encrypted with **Cryptr** (AES-256-GCM) using `ENCRYPTION_KEY` before being written to the database. They are decrypted only at execution time inside the Inngest background job.

### Adding a credential

1. Go to **Credentials** in the sidebar.
2. Click **New Credential**.
3. Select the type (OpenAI, Anthropic, or Gemini).
4. Enter a name and the API key.
5. Save.

The credential is now selectable in any AI node.

### Supported types

| Type | Provider | Used in |
|------|----------|---------|
| `OPENAI` | OpenAI | OpenAI node (GPT-4) |
| `ANTHROPIC` | Anthropic | Anthropic node (Claude) |
| `GEMINI` | Google | Gemini node (Gemini 2.0) |

---

## 11. Execution Engine

### How execution works

```
1. User triggers workflow (manual click or webhook)
2. sendWorkflowExecution() sends event to Inngest
3. Inngest calls executeWorkflow background function
4. Step: "create-execution" → writes Execution row (status: RUNNING)
5. Step: "prepare-workflow" → loads nodes + connections, topological sort
6. Step: "find-user-id" → loads workflow owner's userId
7. For each node (in order):
   - Calls executor(data, nodeId, userId, context, step, publish)
   - Executor publishes status via realtime channel
   - Executor runs its logic in a step (retryable)
   - Returns updated context
8. Step: "update-execution" → writes SUCCESS + output
9. On failure: onFailure handler → writes FAILED + error
```

### Topological sort

Nodes are sorted so every node is executed after all its dependencies. This is handled in `src/inngest/utils.ts` using the `toposort` library.

### Retries

- **Development:** 0 retries (fail fast for debugging)
- **Production:** 3 retries (Inngest handles exponential backoff)

### Execution statuses

| Status | Meaning |
|--------|---------|
| `RUNNING` | Workflow is actively executing |
| `SUCCESS` | All nodes completed, output saved |
| `FAILED` | An error occurred; error + stack saved |

### Viewing executions

1. Go to **Executions** in the sidebar.
2. Click any execution to see its details, output, and error information.

---

## 12. API Reference

### tRPC Procedures

All procedures are accessible at `/api/trpc`. The app uses tRPC with TanStack Query.

#### Access levels

| Level | Description |
|-------|-------------|
| `baseProcedure` | Public, no auth |
| `protectedProcedure` | Requires valid session |
| `premiumProcedure` | Requires session + active Polar subscription (if `POLAR_ACCESS_TOKEN` is set) |

#### Workflows router

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `workflows.getMany` | query | protected | List workflows (paginated, searchable) |
| `workflows.getOne` | query | protected | Get single workflow with nodes + edges |
| `workflows.create` | mutation | premium | Create new workflow |
| `workflows.update` | mutation | protected | Save canvas state (nodes + connections) |
| `workflows.updateName` | mutation | protected | Rename workflow |
| `workflows.remove` | mutation | protected | Delete workflow |
| `workflows.execute` | mutation | protected | Trigger workflow execution |

#### Credentials router

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `credentials.getMany` | query | protected | List credentials (by type) |
| `credentials.getOne` | query | protected | Get single credential |
| `credentials.create` | mutation | protected | Save new encrypted credential |
| `credentials.remove` | mutation | protected | Delete credential |

#### Executions router

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `executions.getMany` | query | protected | List executions (paginated) |
| `executions.getOne` | query | protected | Get execution + output |

### Webhook endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/webhooks/google-form?workflowId=XXX` | POST | Google Form submission trigger |
| `POST /api/webhooks/stripe?workflowId=XXX` | POST | Stripe event trigger |
| `POST /api/inngest` | POST | Inngest background job handler |
| `/api/auth/[...all]` | ANY | Better Auth handler |
| `/api/trpc/[trpc]` | ANY | tRPC handler |

---

## 13. Billing & Subscriptions

Billing is powered by [Polar.sh](https://polar.sh).

### How it works

- When a user signs up, a Polar customer is automatically created (`createCustomerOnSignUp: true`).
- The `premiumProcedure` in tRPC checks if the user has an active Polar subscription before allowing workflow creation.
- If `POLAR_ACCESS_TOKEN` is not set (e.g. in dev), the subscription check is skipped and all users can create workflows.

### Configured product

The app is configured with one Polar product:
- **Product ID:** `f81be8a8-45e1-4e45-a1e9-b9d3fd79f814`
- **Slug:** `pro`

### Enabling billing

1. Create a Polar organization at [polar.sh](https://polar.sh).
2. Create a product with the above product ID (or update it in `src/lib/auth.ts`).
3. Add `POLAR_ACCESS_TOKEN` to `.env`.
4. Set `POLAR_SUCCESS_URL` to redirect users after checkout.

---

## 14. Real-time Updates

Nodebase uses **Inngest Realtime** (`@inngest/realtime`) to stream live node status updates to the browser as workflows execute.

### How it works

- Each node type has a dedicated **channel** (e.g. `slack-execution`, `openai-execution`).
- Each channel has a `status` topic that emits `{ nodeId, status: "loading" | "success" | "error" }`.
- While a workflow is running, the UI subscribes to these channels.
- Node cards on the execution view update in real time.

### Channels

| Node | Channel name |
|------|-------------|
| HTTP Request | `http-request-execution` |
| Manual Trigger | `manual-trigger-execution` |
| Google Form | `google-form-trigger-execution` |
| Stripe Trigger | `stripe-trigger-execution` |
| Anthropic | `anthropic-execution` |
| OpenAI | `openai-execution` |
| Gemini | `gemini-execution` |
| Discord | `discord-execution` |
| Slack | `slack-execution` |

---

## 15. Error Monitoring

Sentry is pre-configured for full-stack error tracking.

### Features enabled

- Server-side error tracking
- Edge runtime error tracking
- Vercel AI SDK integration (records AI inputs/outputs)
- Console log capture (`log`, `warn`, `error`)
- Source maps uploaded on CI
- Tunnel route `/monitoring` (bypasses ad-blockers)

### Configuration files

| File | Purpose |
|------|---------|
| `sentry.server.config.ts` | Server-side Sentry init |
| `sentry.edge.config.ts` | Edge runtime Sentry init |
| `src/instrumentation-client.ts` | Client-side Sentry init |
| `src/app/global-error.tsx` | Top-level error boundary |

### DSN

The Sentry DSN is hardcoded in `sentry.server.config.ts`. Update it to your own project DSN before deploying.

---

## 16. Use Cases & Agency Scenarios

### 1. Facebook Lead Ads → Google Sheets + AI Scoring

```
HTTP Webhook (FB Lead)
  → ANTHROPIC (score lead 1-10 based on fields)
  → HTTP_REQUEST (POST to Google Sheets Apps Script)
  → SLACK (notify sales team with score)
```

### 2. Google Form → CRM + Notification

```
GOOGLE_FORM_TRIGGER (contact form submission)
  → ANTHROPIC (extract structured data from free text)
  → HTTP_REQUEST (POST to HubSpot/Pipedrive API)
  → DISCORD (notify team channel)
```

### 3. Stripe Payment → Onboarding Sequence

```
STRIPE_TRIGGER (payment_intent.succeeded)
  → HTTP_REQUEST (POST to customer record in CRM)
  → OPENAI (generate personalized welcome message)
  → SLACK (notify account manager)
  → HTTP_REQUEST (POST to email service API)
```

### 4. Client Reporting (Scheduled)

```
MANUAL_TRIGGER (or future SCHEDULE trigger)
  → HTTP_REQUEST (GET analytics data from API)
  → GEMINI (summarize into executive report)
  → SLACK (post report to client channel)
```

### 5. AI-Filtered Lead Routing

```
GOOGLE_FORM_TRIGGER
  → ANTHROPIC (classify: hot / warm / cold lead)
  → HTTP_REQUEST (route to correct CRM pipeline based on AI output)
  → DISCORD (alert correct team member)
```

### 6. Stripe Refund → Internal Alert

```
STRIPE_TRIGGER (charge.refunded)
  → ANTHROPIC (analyze refund reason, suggest action)
  → SLACK (#refunds channel with AI summary)
```

---

## 17. Scalability Guide

### Current state

The app runs well for up to ~50 concurrent users out of the box. For 100+ users, apply the following:

### Step 1: Database Connection Pooling

Replace your `DATABASE_URL` with a pooled connection string. On Neon:

```
# Instead of direct connection:
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb

# Use pooled connection:
postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?pgbouncer=true&connection_limit=5
```

On Supabase, use the "Session Mode" pooler URL.

### Step 2: Inngest Concurrency

Add a concurrency limit to prevent workflow runs from overwhelming the DB:

```typescript
// src/inngest/functions.ts
export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    concurrency: { limit: 20 },  // add this
    retries: ...,
  },
  ...
);
```

### Step 3: Rate Limiting

Add API rate limiting using Upstash Redis:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Apply to tRPC routes or webhook endpoints to prevent abuse.

### Step 4: Hosting

| Users | Recommended |
|-------|-------------|
| 1–50 | Vercel Hobby + Neon Free |
| 50–200 | Vercel Pro + Neon Pro (pooler) + Inngest paid |
| 200–1000 | Vercel Enterprise or Railway + Neon Scale + Inngest |

### Capacity summary

| Resource | Free tier limit | Paid tier |
|----------|----------------|-----------|
| Neon DB | 0.5 GB storage, ~100 connections | Scales to TB |
| Vercel functions | 100 GB-hours/mo | Higher on Pro |
| Inngest | 50k events/mo | Scales with plan |
| Polar | No limit | Per transaction fee |

---

## 18. Roadmap

### Phase 1 — Core quality (now)

- [x] Email + password auth
- [x] GitHub + Google OAuth (optional)
- [x] Workflow canvas editor (React Flow)
- [x] Topological node execution
- [x] AI nodes (OpenAI, Anthropic, Gemini)
- [x] Discord + Slack nodes
- [x] Google Form + Stripe trigger
- [x] HTTP Request node with Handlebars
- [x] Encrypted credentials
- [x] Execution history
- [x] Real-time node status
- [x] Polar billing
- [x] Sentry error monitoring

### Phase 2 — High-value integrations

- [ ] `SCHEDULE_TRIGGER` — cron-based trigger (Inngest cron)
- [ ] `GOOGLE_SHEETS` node — read/write rows
- [ ] `GMAIL` / SMTP node — send emails
- [ ] `AIRTABLE` node — read/write records
- [ ] `HUBSPOT` / `PIPEDRIVE` node — CRM operations
- [ ] `CONDITIONAL` node — if/else branching
- [ ] `TRANSFORM` node — reshape context data
- [ ] `DELAY` node — wait N minutes before next step

### Phase 3 — AI intelligence

- [ ] AI Filter node — pass/block based on AI score
- [ ] AI Classify node — categorize inputs into labels
- [ ] AI Summarize node — condense long text
- [ ] AI Extract node — pull structured data from unstructured text

### Phase 4 — Multi-tenant (Agency)

- [ ] Organizations / Workspaces
- [ ] Team members with roles (Owner, Editor, Viewer)
- [ ] Workflow templates (save + share)
- [ ] Client read-only portals
- [ ] Audit log

### Phase 5 — Platform

- [ ] Workflow versioning + rollback
- [ ] Execution replay
- [ ] API key access (trigger workflows via external API)
- [ ] Webhook manager UI (test payloads)
- [ ] Community template marketplace

---

## 19. Adding a New Node

To add a new integration (e.g. Gmail, HubSpot):

### 1. Add to the enum

In `prisma/schema.prisma`:

```prisma
enum NodeType {
  ...
  GMAIL  // add here
}
```

Run `npx prisma migrate dev`.

### 2. Create the Inngest channel

`src/inngest/channels/gmail.ts`:

```typescript
import { channel, topic } from "@inngest/realtime";

export const GMAIL_CHANNEL_NAME = "gmail-execution";

export const gmailChannel = channel(GMAIL_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
```

### 3. Create the executor

`src/features/executions/components/gmail/executor.ts`:

```typescript
import type { NodeExecutor } from "@/features/executions/types";
import { gmailChannel } from "@/inngest/channels/gmail";

type GmailData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  data, nodeId, context, step, publish,
}) => {
  await publish(gmailChannel().status({ nodeId, status: "loading" }));

  const result = await step.run("gmail-send", async () => {
    // your Gmail sending logic here
    return { ...context, [data.variableName!]: { sent: true } };
  });

  await publish(gmailChannel().status({ nodeId, status: "success" }));
  return result;
};
```

### 4. Register the executor

`src/features/executions/lib/executor-registry.ts`:

```typescript
import { gmailExecutor } from "../components/gmail/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  ...
  [NodeType.GMAIL]: gmailExecutor,
};
```

### 5. Register the channel in the Inngest function

`src/inngest/functions.ts`:

```typescript
import { gmailChannel } from "./channels/gmail";

// Inside executeWorkflow, add to channels array:
channels: [
  ...existing channels...,
  gmailChannel(),
],
```

### 6. Create the node UI component

Create dialog, node display, and actions files under:
```
src/features/executions/components/gmail/
  dialog.tsx   # Configuration form shown in the editor
  node.tsx     # Node card shown on canvas + execution view
  actions.ts   # Server actions if needed
```

### 7. Register in node selector

`src/components/node-selector.tsx` — add the node to the selectable list.

### 8. Register in config

`src/config/node-components.ts` — map `NodeType.GMAIL` to your node component.

---

## 20. Deployment

### Vercel (recommended)

1. Push to GitHub.
2. Import project in [Vercel](https://vercel.com).
3. Set all environment variables in Vercel project settings.
4. Deploy.

### Environment variables for production

All variables from `.env.example`, plus:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
POLAR_SUCCESS_URL=https://yourdomain.com/workflows
```

### Database migration in production

```bash
npx prisma migrate deploy
```

Run this as a deploy step or one-time command after deploying.

### Inngest in production

1. Sign up at [inngest.com](https://inngest.com).
2. Create an app.
3. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in your environment (Inngest provides these).
4. Your `/api/inngest` route will automatically connect.

### Sentry in production

Update the DSN in `sentry.server.config.ts` to your own Sentry project DSN.

---

## Support & Contributing

This is a base project intended to be extended. Key areas to focus on when building:

- **New nodes:** Follow the pattern in Section 19.
- **New triggers:** Add a new webhook route in `src/app/api/webhooks/` and follow the same pattern.
- **Auth providers:** Add more OAuth providers in `src/lib/auth.ts` under `socialProviders`.
- **Billing plans:** Configure additional Polar products in `src/lib/auth.ts`.

---

*Documentation generated for Nodebase v0.1.0 — March 2026*
