# Nodebase — Product Ideation & Vision Document

> **Product Manager Perspective | Indian Market | Advanced Automation Platform**  
> Think: Pabbly Connect × n8n × Indian-first stack — but smarter, faster, and built for agencies.

---

## The Big Idea

> **"One platform where Indian agencies automate everything — payments, leads, WhatsApp, AI — without touching code."**

Nodebase becomes a **self-hostable, white-label automation platform** built for:
- Digital marketing agencies in India
- Freelancers running client automation
- Small SaaS teams building internal workflows
- Businesses on Indian payment stacks (Razorpay, PayU, Cashfree)
- Teams that live on WhatsApp, not email

---

## Why Pabbly Is Winning (and How We Beat Them)

| What Pabbly does | Our advantage |
|-----------------|---------------|
| Cloud-only, no control | **Self-hostable** — agency owns the data |
| Task-based limits | **Execution-based**, fairer pricing |
| No AI intelligence | **AI-first nodes** baked in (filter, score, summarize) |
| No white-label | **White-label** — agency sells it to clients |
| 2000+ integrations but shallow | Fewer but **deeper** integrations with full data mapping |
| No Indian-first design | **Razorpay, WhatsApp, Zoho, MSG91** as first-class nodes |
| SaaS pricing in USD | **INR pricing**, one-time license option |

---

## Target Personas

### Persona 1 — "Agency Rohan" (Primary)
- Runs a 5–15 person digital marketing agency in Tier 1/2 city
- Clients: Real estate, EdTech, Healthcare, D2C brands
- Pain: Manually moves Facebook leads into spreadsheets, WhatsApp groups, CRM
- Budget: ₹5,000–₹20,000/month for tools
- Currently uses: Pabbly, Zapier, or nothing (manual work)
- **Wants:** One tool that handles all client automation, billable to clients

### Persona 2 — "Freelancer Priya" (Secondary)
- Solo freelancer offering "automation as a service"
- Sells workflows to 5–20 clients at ₹3,000–₹10,000/month
- Pain: Rebuilds same workflows manually per client
- **Wants:** Template library, clone workflows, white-label interface

### Persona 3 — "SaaS Founder Arjun" (Power User)
- Early-stage startup needing internal automation
- Pain: Engineer time wasted on integration scripts
- **Wants:** Self-hostable, programmable via API, no vendor lock-in

---

## Indian-First Integration Stack

### Payments (replace Stripe completely)

| Node | Provider | Use Case |
|------|----------|---------|
| `RAZORPAY_TRIGGER` | Razorpay | Payment success, refund, subscription events |
| `RAZORPAY_ACTION` | Razorpay | Create payment link, generate invoice |
| `PAYU_TRIGGER` | PayU | Payment events |
| `CASHFREE_TRIGGER` | Cashfree | Payment events + payouts |
| `INSTAMOJO_TRIGGER` | Instamojo | Creator payments trigger |
| `UPI_TRIGGER` | Generic UPI | Generic UPI payment confirmation via webhook |

> **Why:** 98% of Indian businesses use Razorpay/PayU. Stripe is rare. This is table stakes.

---

### WhatsApp (biggest differentiator)

| Node | Provider | Use Case |
|------|----------|---------|
| `WHATSAPP_SEND` | Meta Cloud API | Send template/session messages |
| `WHATSAPP_TRIGGER` | Meta Webhooks | Incoming message triggers workflow |
| `WHATSAPP_TEMPLATE` | Meta Cloud API | Send approved template messages |
| `WATI_SEND` | WATI | WhatsApp via WATI API (popular in India) |
| `INTERAKT_SEND` | Interakt | WhatsApp via Interakt (Y Combinator-backed, India) |
| `AiSensy_SEND` | AiSensy | WhatsApp broadcasts |
| `WHATSAPP_GROUP` | Meta | Group message automation (limited) |

**Sample workflow:**
```
Razorpay payment success
  → WHATSAPP_SEND (customer: "Your payment of ₹{{amount}} received! Order #{{orderId}}")
  → WHATSAPP_SEND (owner: "New order from {{customerName}} - ₹{{amount}}")
  → GOOGLE_SHEETS (log order)
```

> **Why:** WhatsApp has 500M+ Indian users. Every Indian business communicates on WhatsApp. This is THE killer feature.

---

### Instagram DM Automation (Major Differentiator)

Instagram DM automation is one of the **fastest growing** use cases for Indian agencies — coaches, D2C brands, real estate agents, and influencers all get DMs as leads and lose them because they can't respond at scale.

| Node | What it does |
|------|-------------|
| `INSTAGRAM_DM_TRIGGER` | Trigger workflow when someone DMs your Instagram account |
| `INSTAGRAM_DM_SEND` | Send a DM reply to a user |
| `INSTAGRAM_COMMENT_TRIGGER` | Trigger when someone comments on a post |
| `INSTAGRAM_COMMENT_REPLY` | Auto-reply to a comment on your post |
| `INSTAGRAM_STORY_MENTION_TRIGGER` | Trigger when someone mentions your account in a story |
| `INSTAGRAM_LEAD_TRIGGER` | Trigger from Instagram Lead Ads (existing) |
| `INSTAGRAM_MEDIA_PUBLISH` | Post an image/reel (scheduled content) |

**How it works (Meta Webhooks + Graph API):**
- Connect Instagram Business Account via OAuth
- Meta sends webhook events for DMs, comments, story mentions
- Workflow triggers, AI processes the message, sends a reply

**Sample workflows:**

```
[User DMs "price" on Instagram]
  → AI_CLASSIFY (intent: pricing inquiry, support, general?)
  → INSTAGRAM_DM_SEND ("Hi {{username}}! Our pricing starts at ₹999. 
                         Can I share more details? Click here: {{linkUrl}}")
  → WHATSAPP_SEND (team: "New DM lead from @{{username}} — check now!")
  → LEADSQUARED_CREATE (add as lead with source: Instagram DM)
```

```
[User comments "interested" on a product post]
  → INSTAGRAM_COMMENT_REPLY ("Thanks {{username}}! DM us for more details 🙌")
  → INSTAGRAM_DM_SEND ("Hi {{username}}, noticed you're interested! 
                         Here's what we offer: ...")
  → GOOGLE_SHEETS_WRITE (log comment lead)
```

```
[Instagram Lead Ad submitted]
  → AI_EXTRACT (name, phone, interest from form)
  → INSTAGRAM_DM_SEND ("Hi {{name}}! Thanks for your interest...")
  → WHATSAPP_SEND (sales team notification)
  → LEADSQUARED_CREATE
```

**Instagram DM automation use cases by industry:**

| Industry | Use Case |
|----------|---------|
| Coaching / EdTech | "DM INFO" → auto send course details + collect phone |
| Real Estate | Comment "interested" → DM brochure + add to CRM |
| D2C / E-Commerce | DM "price" → send catalog link + WhatsApp follow-up |
| Fitness / Yoga | Story mention → auto thank + DM discount code |
| Restaurants / Cafes | Comment on reel → DM menu + location link |
| Influencer / Creator | Fan DMs → auto reply + add to email list |

**Key technical notes:**
- Requires **Instagram Business / Creator account** linked to a Facebook Page
- Uses **Meta Graph API** + **Webhooks** (same developer app as Facebook Lead Ads)
- DM automation works only for accounts that **users have messaged first** (Meta policy) — or via Lead Ads and Comment replies which allow first-contact
- Comment auto-reply is fully allowed with no restriction
- **24-hour messaging window** for DMs — must reply within 24 hours of user's last message

> **Why this wins:** No Indian automation platform has built-in Instagram DM + Comment automation as a visual node. Agencies charge ₹5,000–₹15,000/month just for this feature. It's a standalone product — inside ours.

---

### Indian CRM & Lead Tools

| Node | Provider |
|------|----------|
| `LEADSQUARED_CREATE` | LeadSquared (most popular Indian CRM) |
| `ZOHO_CRM_CREATE` | Zoho CRM |
| `FRESHSALES_CREATE` | Freshsales (Freshworks, Chennai) |
| `SALESFORCE_CREATE` | Salesforce |
| `HUBSPOT_CREATE` | HubSpot |
| `PIPEDRIVE_CREATE` | Pipedrive |
| `BITRIX24_CREATE` | Bitrix24 |

---

### Indian SMS & Notification Providers

| Node | Provider |
|------|----------|
| `MSG91_SMS` | MSG91 (most popular in India) |
| `TEXTLOCAL_SMS` | Textlocal |
| `TWILIO_SMS` | Twilio |
| `FAST2SMS_SMS` | Fast2SMS (budget option) |
| `PUSH_NOTIFICATION` | Firebase FCM |

---

### Email Providers

| Node | Provider |
|------|----------|
| `GMAIL_SEND` | Gmail API |
| `SMTP_SEND` | Generic SMTP |
| `MAILCHIMP_SEND` | Mailchimp |
| `SENDGRID_SEND` | SendGrid |
| `BREVO_SEND` | Brevo (formerly Sendinblue, popular in India) |

---

### Forms & Lead Capture

| Node | Provider |
|------|----------|
| `GOOGLE_FORM_TRIGGER` | Google Forms (existing) |
| `TYPEFORM_TRIGGER` | Typeform |
| `JOTFORM_TRIGGER` | JotForm |
| `TALLY_TRIGGER` | Tally Forms |
| `FACEBOOK_LEAD_TRIGGER` | Facebook Lead Ads (huge in India) |
| `INSTAGRAM_LEAD_TRIGGER` | Instagram Lead Ads |
| `INDIAMART_LEAD_TRIGGER` | IndiaMart leads (massive B2B platform in India) |
| `JUSTDIAL_LEAD_TRIGGER` | Just Dial leads |
| `SULEKHA_LEAD_TRIGGER` | Sulekha leads |
| `99ACRES_TRIGGER` | 99acres (real estate leads) |
| `MAGICBRICKS_TRIGGER` | MagicBricks leads |

> **Why Facebook + IndiaMart + 99acres:** These are the TOP lead sources for Indian agencies. Every real estate / home services / B2B company uses these. No other platform treats them as first-class.

---

### Indian E-Commerce

| Node | Provider |
|------|----------|
| `SHOPIFY_TRIGGER` | Shopify (order created, paid, refunded) |
| `WOOCOMMERCE_TRIGGER` | WooCommerce |
| `OPENCART_TRIGGER` | OpenCart |
| `UNICOMMERCE_TRIGGER` | Unicommerce (India logistics) |
| `SHIPROCKET_ACTION` | Shiprocket (create shipment) |
| `DELHIVERY_ACTION` | Delhivery |
| `BLUEDART_ACTION` | Blue Dart |

---

### Sheets & Data

| Node | Provider |
|------|----------|
| `GOOGLE_SHEETS_READ` | Read rows |
| `GOOGLE_SHEETS_WRITE` | Append / update rows |
| `GOOGLE_SHEETS_LOOKUP` | Find row by value |
| `AIRTABLE_CREATE` | Airtable |
| `NOTION_CREATE` | Notion |
| `EXCEL_ONLINE` | Microsoft Excel |

---

### Scheduling & Calendar

| Node | Provider |
|------|----------|
| `GOOGLE_CALENDAR_CREATE` | Create calendar event |
| `CALENDLY_TRIGGER` | Calendly booking trigger |
| `CAL_COM_TRIGGER` | Cal.com booking trigger |

---

### AI Nodes (Advanced)

| Node | What it does |
|------|-------------|
| `AI_FILTER` | Pass/block based on AI quality score (e.g. lead score < 5 → drop) |
| `AI_CLASSIFY` | Categorize data into labels (hot/warm/cold lead) |
| `AI_EXTRACT` | Pull structured fields from messy text |
| `AI_SUMMARIZE` | Summarize long content |
| `AI_TRANSLATE` | Translate content (Hindi ↔ English, etc.) |
| `AI_SENTIMENT` | Detect positive/negative/neutral sentiment |
| `AI_GENERATE_IMAGE` | Generate image via DALL-E or Stable Diffusion |
| `OPENAI` | Custom GPT-4 prompt (existing) |
| `ANTHROPIC` | Custom Claude prompt (existing) |
| `GEMINI` | Custom Gemini prompt (existing) |

> **Hindi/regional language support** in AI nodes is a major differentiator for Indian market.

---

### Logic & Control Nodes

| Node | What it does |
|------|-------------|
| `CONDITIONAL` | If/else branching based on context values |
| `SWITCH` | Multi-branch (like switch/case) |
| `LOOP` | Iterate over array from previous node |
| `DELAY` | Wait N minutes/hours/days |
| `RETRY` | Retry previous node on failure |
| `MERGE` | Merge outputs from parallel branches |
| `TRANSFORM` | Map/reshape context data (JSON path) |
| `TEMPLATE` | Handlebars template (existing, surface better) |
| `FORMULA` | Math/string operations on context values |
| `DEDUPLICATE` | Filter out duplicate records |

---

### Developer & Advanced Nodes

| Node | What it does |
|------|-------------|
| `HTTP_REQUEST` | Generic HTTP (existing) |
| `WEBHOOK_TRIGGER` | Generic inbound webhook |
| `CRON_TRIGGER` | Schedule-based trigger |
| `CODE_NODE` | Run custom JavaScript/Python snippet |
| `SUB_WORKFLOW` | Call another workflow as a step |
| `SPLIT` | Fan-out to parallel branches |

---

## Core Platform Features

### 1. Workflow Canvas (Enhanced)

Current state: Basic React Flow canvas with node selector.

Improvements:
- **Node search** — type to find any node
- **Node groups / folders** — group related nodes visually
- **Minimap** — navigate large workflows
- **Copy/paste nodes**
- **Undo/redo** history
- **Comments / sticky notes** on canvas
- **Workflow descriptions** — document what each workflow does
- **Version history** — restore previous versions

---

### 2. Workflow Templates Library

Pre-built workflows that users can import in one click:

**Marketing:**
- Facebook Lead → WhatsApp notify + CRM + Sheets
- Google Form → Lead scoring (AI) → CRM + WhatsApp
- IndiaMart lead → Auto WhatsApp response + CRM entry
- Instagram Lead Ads → WhatsApp + LeadSquared

**E-Commerce:**
- Razorpay payment → WhatsApp receipt + Shiprocket order
- Order placed → Inventory update + WhatsApp + Slack
- Refund requested → CRM note + WhatsApp + team alert

**Social Media / Instagram:**
- Instagram DM "price" / "info" → AI reply → DM back + add to CRM
- Instagram comment "interested" → Comment reply + DM → WhatsApp notify team
- Instagram Lead Ad → DM welcome + WhatsApp + LeadSquared
- Story mention → Auto DM thank-you + discount code

**Real Estate:**
- 99acres/MagicBricks lead → AI qualify → WhatsApp follow-up + CRM
- Site visit booked → Google Calendar + WhatsApp reminder + agent Slack

**Education / EdTech:**
- Razorpay enrollment → WhatsApp welcome + Google Sheets + Zoho CRM
- Form submission → AI filter (serious/not serious) → WhatsApp + email

---

### 3. Multi-Step Testing

- **Test mode:** Run workflow with sample/mock data without real side effects
- **Node preview:** See what data a node will receive before running
- **Payload inspector:** See full context at each step
- **Debug log:** Step-by-step execution log in the UI

---

### 4. Execution Dashboard

Enhanced beyond current executions list:
- **Timeline view:** Visual step-by-step execution timeline
- **Error drill-down:** See exactly which node failed and why
- **Execution replay:** Re-run failed execution with same input data
- **Execution search:** Search by date, status, workflow, trigger data
- **Execution alerts:** WhatsApp/Slack alert when a workflow fails

---

### 5. Credentials Vault

Beyond current 3 credential types:

- All API keys, OAuth tokens, webhook secrets stored encrypted
- **OAuth2 connect flow** — "Connect with Google", "Connect with Zoho"
- **Credential health check** — detect expired tokens
- **Credential sharing** — team members can use shared credentials
- **Credential rotation** — update API key in one place, all nodes update

---

### 6. Webhook Manager

Dedicated UI for managing inbound webhooks:
- See all webhook URLs in one place
- **Webhook history** — last 100 received payloads, inspectable
- **Payload tester** — replay any past payload through the workflow
- **Webhook security** — verify signatures (Razorpay, Stripe, etc.)
- **IP allowlisting** — restrict which IPs can trigger

---

### 7. Scheduler (Cron Trigger)

Visual cron builder:
- Every N minutes / hours / days
- Specific days of week
- Specific time of day
- Timezone support (IST default)

**Indian use cases:**
- Daily lead report at 9 AM IST to WhatsApp/Slack
- Weekly revenue summary on Sunday 6 PM
- Monthly GST reminder workflow

---

## Multi-Tenant / Agency Architecture

This is the **revenue multiplier** for agencies.

### Organizations & Workspaces

```
Agency Owner (Rohan's Agency)
  └── Workspace: Client A (Real Estate Company)
        └── Workflows: Lead routing, Payment follow-up
  └── Workspace: Client B (EdTech Startup)
        └── Workflows: Enrollment automation, Attendance reminder
  └── Workspace: Client C (D2C Brand)
        └── Workflows: Order notifications, Review requests
```

- Agency manages all client workspaces from one dashboard
- Each workspace is isolated (data, credentials, workflows)
- Agency can clone a workflow from one workspace to another

### Team Roles

| Role | Permissions |
|------|------------|
| Owner | Full access, billing, invite members |
| Admin | Create/edit/delete workflows, manage credentials |
| Editor | Create/edit workflows, cannot delete |
| Viewer | View workflows and executions only |
| Client | View their own workspace's executions only |

### White-Label Mode

Agency can brand the platform for their clients:
- Custom logo and color scheme
- Custom domain (app.rohansagency.com)
- Remove all "Nodebase" branding
- Agency name in all emails/notifications

> **Business model:** Agency pays ₹5,000–₹15,000/month, resells to 10 clients at ₹2,000–₹3,000/month each. Profit center, not a cost center.

---

## AI Intelligence Layer (The Differentiator)

### Lead Scoring Agent

```
[Facebook Lead comes in]
  → AI analyzes: name, phone, email, message, source
  → Outputs: { score: 8, category: "hot", reason: "specific project mention", recommended_action: "call within 1 hour" }
  → If score >= 7: WhatsApp to senior sales + CRM as Hot
  → If score 4-6: WhatsApp to junior sales + CRM as Warm
  → If score < 4: Auto WhatsApp template reply + CRM as Cold
```

### AI Assistant Node

A conversational node that can:
- Read previous context (form data, payment data, etc.)
- Generate personalized messages in Hindi or English
- Decide next step based on data content
- Act as an intelligent router

### AI Data Cleaner

- Deduplicate leads by phone number
- Standardize phone numbers (add +91, remove spaces)
- Fix name formatting
- Validate email format
- Detect spam/bot submissions

---

## Pricing Strategy (INR, India-First)

### Individual / Freelancer

| Plan | Price | Limits |
|------|-------|--------|
| Starter (Free) | ₹0 | 3 workflows, 500 executions/month |
| Pro | ₹999/month | 20 workflows, 10,000 executions/month, AI nodes |
| Power | ₹2,499/month | Unlimited workflows, 50,000 executions/month |

### Agency

| Plan | Price | Limits |
|------|-------|--------|
| Agency Starter | ₹4,999/month | 5 client workspaces, 100,000 executions |
| Agency Pro | ₹9,999/month | 20 client workspaces, 500,000 executions, white-label |
| Agency Enterprise | ₹19,999/month | Unlimited workspaces, custom domain, SLA |

### One-Time License (Pabbly-style option, India loves this)

| License | Price | What's included |
|---------|-------|----------------|
| Lifetime Personal | ₹14,999 | Forever access, 1 workspace, updates for 2 years |
| Lifetime Agency | ₹39,999 | Forever access, unlimited workspaces, white-label |

> **Why one-time:** Indian market strongly prefers one-time payment over subscriptions (Pabbly has proven this model works). This is a major acquisition strategy.

### Add-ons

- Extra 10,000 executions: ₹499/month
- Extra workspace: ₹999/month
- Priority support: ₹2,000/month
- Custom node development: ₹15,000–₹50,000 per node

---

## Go-to-Market Strategy

### Phase 1 — Community Launch (Month 1–3)

- Post on **Indie Hackers India**, **SaaS Boilerplates India** communities
- YouTube tutorials in **Hindi + English** (like Pabbly's 12,000+ video strategy)
- **Facebook Group:** "Indian Agency Automation" — build community first
- Free lifetime license for first 100 users (build testimonials)
- Twitter/X threads: "How I automated [real estate / edtech] leads with AI"

### Phase 2 — Agency Partnerships (Month 3–6)

- Partner with **digital marketing agencies** — offer white-label reseller deal
- Attend **affiliate marketing / agency events** (Delhi, Mumbai, Bangalore)
- Agency reseller program: 30% recurring commission
- Case studies: "Agency saved 40 hours/week using Nodebase"

### Phase 3 — Vertical Focus (Month 6–12)

Go deep in 2–3 verticals with specialized templates + integrations:

1. **Real Estate:** 99acres, MagicBricks, Housing.com triggers + WhatsApp follow-up
2. **EdTech:** Razorpay enrollment → onboarding sequence automation
3. **D2C / E-Commerce:** Shopify + Shiprocket + WhatsApp order notifications

### Phase 4 — Product-Led Growth (Month 12+)

- **Free tier** captures freelancers → they sell it to clients → upgrades to agency plan
- **Template marketplace** — community shares workflows → drives discovery
- **API access** — developers integrate Nodebase triggers into their SaaS

---

## Technical Architecture for Scale

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                      │
│         Next.js App Router (React 19, Jotai)            │
└───────────────────────┬─────────────────────────────────┘
                        │ tRPC + TanStack Query
┌───────────────────────▼─────────────────────────────────┐
│                   Next.js Server                         │
│         (Vercel / Railway / Self-hosted)                 │
│   tRPC routers │ Better Auth │ Webhook handlers          │
└─────┬─────────────────┬────────────────┬────────────────┘
      │                 │                │
      ▼                 ▼                ▼
 PostgreSQL         Inngest          Redis (Upstash)
 (Neon pooled)   Background jobs    Rate limiting +
 Primary DB       Workflow runs      Session cache
      │                 │
      ▼                 ▼
 Prisma ORM      Node Executors
 (connection      (AI, HTTP, WhatsApp,
  pooled)          Razorpay, Sheets...)
```

### Infrastructure per scale tier

| Users | Setup | Cost estimate |
|-------|-------|--------------|
| 0–100 | Vercel Hobby + Neon Free + Inngest Free | ₹0–₹500/month |
| 100–500 | Vercel Pro + Neon Pro + Inngest Basic | ₹3,000–₹8,000/month |
| 500–5000 | Vercel Pro + Neon Scale + Inngest Pro + Redis | ₹15,000–₹40,000/month |
| 5000+ | Railway/AWS + RDS + Inngest Enterprise + Redis | Custom |

---

## Key Technical Improvements to Build Now

### Priority 1 — Make it sellable

1. **Razorpay trigger** (replace Stripe — non-negotiable for India)
2. **WhatsApp send node** (via Meta Cloud API or WATI)
3. **CONDITIONAL node** (if/else branching)
4. **CRON TRIGGER** (schedule-based)
5. **GOOGLE_SHEETS write node**

### Priority 2 — Make it powerful

6. **FACEBOOK_LEAD_TRIGGER** (most requested by agencies)
7. **MSG91 SMS node** (Indian SMS provider)
8. **DELAY node** (wait before next step)
9. **AI_FILTER node** (intelligent lead filtering)
10. **Workflow templates** (import pre-built workflows)

### Priority 3 — Make it an agency product

11. **Organizations / Workspaces** (multi-client)
12. **Team roles** (Owner, Editor, Viewer)
13. **White-label** (custom branding)
14. **Execution alerts** (WhatsApp notify on failure)
15. **Webhook history + replay**

---

## Feature Comparison vs. Competitors

| Feature | Nodebase (Vision) | Pabbly | Zapier | n8n |
|---------|-----------------|--------|--------|-----|
| Visual canvas | ✅ React Flow | ✅ | ✅ | ✅ |
| Self-hostable | ✅ | ❌ | ❌ | ✅ |
| White-label | ✅ | ❌ | ❌ | ❌ |
| Razorpay native | ✅ | ✅ | ✅ | ✅ |
| WhatsApp native | ✅ | ✅ | Limited | ✅ |
| Instagram DM automation | ✅ | ❌ | ❌ | ❌ |
| Instagram Comment auto-reply | ✅ | ❌ | ❌ | ❌ |
| AI nodes built-in | ✅ | ❌ | Limited | Limited |
| AI lead scoring | ✅ | ❌ | ❌ | ❌ |
| IndiaMart trigger | ✅ | ❌ | ❌ | ❌ |
| 99acres trigger | ✅ | ❌ | ❌ | ❌ |
| INR pricing | ✅ | ✅ | ❌ | ❌ |
| One-time license | ✅ | ✅ | ❌ | ❌ |
| Multi-workspace | ✅ | ❌ | ✅ | ✅ |
| Conditional logic | ✅ | ✅ | ✅ | ✅ |
| Hindi AI support | ✅ | ❌ | ❌ | ❌ |
| Real-time node status | ✅ | ❌ | ❌ | ❌ |
| Open source base | ✅ | ❌ | ❌ | ✅ |

---

## 6-Month Sprint Plan

### Month 1 — Foundation
- [ ] Replace Stripe with **Razorpay trigger**
- [ ] Add **WhatsApp Send node** (Meta Cloud API)
- [ ] Add **CONDITIONAL node** (if/else)
- [ ] Add **DELAY node** (Inngest step.sleep)
- [ ] Add **CRON TRIGGER**
- [ ] Fix all current errors (Polar, ENCRYPTION_KEY) ✅ Done

### Month 2 — Lead Engine
- [ ] **Facebook Lead Ads trigger**
- [ ] **Instagram DM trigger** (user sends DM → trigger workflow)
- [ ] **Instagram Comment trigger** (user comments → auto reply)
- [ ] **Instagram DM Send node** (send DM reply)
- [ ] **Instagram Comment Reply node**
- [ ] **Google Sheets** read/write node
- [ ] **MSG91 SMS node**
- [ ] **AI_FILTER node** (smart lead scoring)
- [ ] **AI_EXTRACT node** (structure messy data)
- [ ] Workflow **Templates library** (5 starter templates)

### Month 3 — Agency Ready
- [ ] **Organizations / Workspaces** (multi-client)
- [ ] **Team member invites** with roles
- [ ] **Execution alerts** (notify on failure via WhatsApp)
- [ ] **Webhook history** + payload replay
- [ ] **Workflow cloning** (copy to another workspace)

### Month 4 — Deep Integrations
- [ ] **LeadSquared CRM** node
- [ ] **Zoho CRM** node
- [ ] **Shiprocket** action node
- [ ] **IndiaMart lead trigger**
- [ ] **99acres lead trigger**
- [ ] **LOOP node** (iterate arrays)
- [ ] **TRANSFORM node** (data reshaping)

### Month 5 — Power Features
- [ ] **White-label** (custom logo, colors, domain)
- [ ] **AI_CLASSIFY node**
- [ ] **CODE node** (custom JS execution)
- [ ] **SUB_WORKFLOW node** (call workflow within workflow)
- [ ] **Workflow versioning** + rollback
- [ ] **Execution replay** (re-run with same payload)

### Month 6 — Go-to-Market
- [ ] **Template marketplace** (community + curated)
- [ ] **API access** (external triggers via API key)
- [ ] **Razorpay billing** integration (replace Polar)
- [ ] **INR pricing tiers** live
- [ ] **Affiliate / reseller program**
- [ ] **Hindi documentation** + YouTube tutorials

---

## The Killer Workflow (Lead to Deal in 60 Seconds)

This is the one workflow that sells the product:

```
[Facebook Lead Ad submitted]
         ↓
[AI_EXTRACT node]
  → Extract: name, phone, budget, location, project_type
         ↓
[AI_FILTER node]
  → Score 1-10. If score < 4, drop. If 4-6, warm. If 7+, hot.
         ↓
[CONDITIONAL node] ← Split by score
    ↓ Hot                    ↓ Warm               ↓ Cold
[WHATSAPP_SEND]        [WHATSAPP_SEND]       [WHATSAPP_TEMPLATE]
 Senior sales           Junior sales          Auto response
 (immediate)            (within 2hrs)         (thanks, will reach)
    ↓                        ↓
[LEADSQUARED]          [LEADSQUARED]
 Mark: Hot priority     Mark: Warm nurture
    ↓
[MSG91_SMS]
 Sales manager SMS
    ↓
[GOOGLE_SHEETS]
 Log all leads with score
    ↓
[DELAY: 24 hours]
    ↓
[WHATSAPP_SEND]
 Follow-up if not responded
```

**Value proposition in this single workflow:**
- Zero manual work
- Lead gets response in < 30 seconds
- Sales team only sees qualified leads
- Everything logged automatically
- Follow-up automated

This one workflow saves an agency **3–5 hours per day**.

---

## Summary — What Makes This Win

1. **Indian-first:** Razorpay, WhatsApp, IndiaMart, MSG91, Shiprocket — not afterthoughts
2. **AI-powered:** Not just connecting tools, but intelligently routing and scoring data
3. **Agency model:** White-label + multi-workspace = agencies resell it
4. **Visual + powerful:** React Flow canvas gives a better UX than Pabbly's linear builder
5. **Self-hostable:** Agencies with data-conscious clients can host on their own server
6. **INR + one-time option:** Matches Indian buying psychology
7. **Open base:** Developers can extend it, build custom nodes, contribute

> **One sentence pitch:**  
> "Nodebase is the AI-powered automation platform built for Indian agencies — connect Facebook leads, Razorpay payments, WhatsApp, and your CRM in one visual workflow, with no code."

---

*Product ideation document — Nodebase v2.0 vision | March 2026*
