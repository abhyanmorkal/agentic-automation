User: we have curent node system all node have get data and send date currenly we have webhook node that recive date through webhook url and save the respone for next node and we have google sheet node when connect both the node the google sheet node have optoion to map the date throug the previous node connect response date but currenlty now woing proplery no able to select previous responce value date check and fix

Claude: Let me examine the relevant files to understand the current state.

Read [](file:///d%3A/node%20base/nodebase-main/src/features/executions/components/google-sheets/dialog.tsx)

User: <ide_opened_file>The user opened the file d:\node base\nodebase-main\src\features\triggers\components\webhook-trigger\node.tsx in the IDE. This may or may not be related to the current task.</ide_opened_file>on the send the test row i want send date like mapcloumn data that will save rescently on column mapping on google sheet

Claude: Let me look at the current test row handler and its API endpoint.

Searched for regex `google-sheets/test`

User: my software for trigger and automation tool i currenly we have 3 node webhook, fabook form triggerd, and google sheet, you have go through all three node check deeply the impovement and inhancemate for these there node this is the node base system so check plan the todo for impovement

Claude: Used tool: Agent

Searched for files matching `src/features/triggers/components/webhook-trigger/**`

Searched for files matching `src/app/api/triggers/webhook/**`

Searched for files matching `src/app/workflow/sendwebhookdata/**`

Ran terminal command: find /d/node\ base/nodebase-main -name "schema.prisma" -type f

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/node.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/actions.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/webhook/test/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/webhook/save-response/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/workflow/sendwebhookdata/%5Btoken%5D/route.ts)

Searched for files matching `src/inngest/**`

Read [](file:///d/node%20base/nodebase-main/src/inngest/channels/webhook-trigger.ts)

Read [](file:///d/node%20base/nodebase-main/src/inngest/functions.ts)

Ran terminal command: grep -r "webhookTriggerExecutor\|webhook" "/d/node base/nodebase-main/src/inngest/functions.ts" | head -50

Ran terminal command: grep -A 20 "WEBHOOK_TRIGGER\|webhook" "/d/node base/nodebase-main/prisma/schema.prisma" | head -100

Ran terminal command: find "/d/node base/nodebase-main" -name "executor-registry*" -type f

Ran terminal command: find "/d/node base/nodebase-main" -name "*executor*" -type f | head -20

Read [](file:///d/node%20base/nodebase-main/src/features/executions/lib/executor-registry.ts)

Read [](file:///d/node%20base/nodebase-main/prisma/schema.prisma)

Read [](file:///d/node%20base/nodebase-main/src/inngest/utils.ts)

Ran terminal command: find "/d/node base/nodebase-main/src/features/executions" -name "types.ts" -type f

Read [](file:///d/node%20base/nodebase-main/src/features/executions/types.ts)

Ran terminal command: find "/d/node base/nodebase-main/src/features/triggers/components" -name "base-trigger-node*" -type f

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/base-trigger-node.tsx)

Ran terminal command: grep -r "sampleResponseRaw\|savedResponses" "/d/node base/nodebase-main/src" --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

Read [](file:///d/node%20base/nodebase-main/src/features/executions/components/google-sheets/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/executions/components/google-sheets/node.tsx)

Ran terminal command: cd "/d/node base/nodebase-main" && git diff src/features/triggers/components/webhook-trigger/dialog.tsx | head -200

Ran terminal command: cd "/d/node base/nodebase-main" && git diff src/features/triggers/components/webhook-trigger/node.tsx | head -100

Ran terminal command: cd "/d/node base/nodebase-main" && git diff src/app/workflow/sendwebhookdata/[token]/route.ts | head -200

Ran terminal command: cd "/d/node base/nodebase-main" && git status --short

Ran terminal command: cd "/d/node base/nodebase-main" && git diff --stat

Ran terminal command: ls -la "/d/node base/nodebase-main/src/app/api/triggers/webhook/save-response/"

Ran terminal command: find "/d/node base/nodebase-main/src/app/api/triggers/webhook/save-response" -type f

Ran terminal command: grep -r "WEBHOOK_TRIGGER" "/d/node base/nodebase-main/src" --include="*.ts" --include="*.tsx" | grep -v node_modules | head -30

Ran terminal command: find "/d/node base/nodebase-main/src/features/triggers/components" -type d | head -20

Read [](file:///d/node%20base/nodebase-main/src/config/node-components.ts)

Read [](file:///d/node%20base/nodebase-main/src/components/node-selector.tsx)

Used tool: Agent

Searched for files matching `src/features/triggers/components/facebook-lead-trigger/**/*`

Searched for files matching `src/app/api/triggers/facebook*/**/*`

Searched for files matching `src/app/api/triggers/webhook/**/*`

Searched for files matching `src/inngest/**/*facebook*`

Ran terminal command: find /d/node\ base/nodebase-main -type f -name "*facebook*" 2>/dev/null | head -50

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/node.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/executor.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/actions.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/facebook-lead/sample/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/facebook-lead/test/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/inngest/channels/facebook-page.ts)

Ran terminal command: find /d/node\ base/nodebase-main/src -type f -path "*webhook*facebook*" 2>/dev/null

Ran terminal command: find /d/node\ base/nodebase-main/src -type f -path "*facebook*webhook*" 2>/dev/null

Searched for files matching `src/app/api/webhooks/**/*facebook*`

Ran terminal command: ls -la /d/node\ base/nodebase-main/src/app/api/webhooks/ 2>/dev/null | head -20

Read [](file:///d/node%20base/nodebase-main/src/app/api/webhooks/facebook-leads/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/lib/facebook-oauth.ts)

Ran terminal command: find /d/node\ base/nodebase-main/src/app/api/auth -name "*facebook*" -type f 2>/dev/null

Ran terminal command: find /d/node\ base/nodebase-main/src/app/api/auth -type d -name facebook 2>/dev/null

Ran terminal command: ls -la /d/node\ base/nodebase-main/src/app/api/auth/ 2>/dev/null | grep -i face

Ran terminal command: find /d/node\ base/nodebase-main/src/app/api/auth/facebook -type f 2>/dev/null

Searched for files matching `src/app/api/auth/facebook/**/*`

Read [](file:///d/node%20base/nodebase-main/src/app/api/auth/facebook/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/auth/facebook/callback/route.ts)

Ran terminal command: grep -r "sendWorkflowExecution" /d/node\ base/nodebase-main/src/inngest --include="*.ts" 2>/dev/null | head -5

Ran terminal command: grep -r "facebookLead" /d/node\ base/nodebase-main/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | head -15

Read [](file:///d/node%20base/nodebase-main/src/features/executions/lib/variable-tree.ts)

Ran terminal command: grep -A 30 "facebookLead" /d/node\ base/nodebase-main/src/features/executions/lib/variable-tree.ts

Ran terminal command: grep -r "FACEBOOK_LEAD_TRIGGER" /d/node\ base/nodebase-main/src --include="*.ts" --include="*.tsx" 2>/dev/null | head -20

Ran terminal command: grep -i "facebook" /d/node\ base/nodebase-main/prisma/schema.prisma 2>/dev/null

Ran terminal command: grep -A 50 "sendWorkflowExecution" /d/node\ base/nodebase-main/src/inngest/utils.ts | head -70

Ran terminal command: grep -B 5 -A 30 "nodeId, status" /d/node\ base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/executor.ts

Ran terminal command: grep -r "subscribe" /d/node\ base/nodebase-main/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i facebook | head -10

Ran terminal command: find /d/node\ base/nodebase-main -name "*.env*" -o -name ".env" 2>/dev/null | head -5

Read [](file:///d/node%20base/nodebase-main/.env.example)

Ran terminal command: grep -i "facebook" /d/node\ base/nodebase-main/.env.example

Ran terminal command: grep -i "facebook" /d/node\ base/nodebase-main/.env | head -10

Ran terminal command: grep -i "VERIFY_TOKEN\|WEBHOOK" /d/node\ base/nodebase-main/.env

Ran terminal command: grep -B 5 -A 5 "FACEBOOK_LEAD_TRIGGER" /d/node\ base/nodebase-main/src/config/node-components.ts

Ran terminal command: grep -B 5 -A 10 "FACEBOOK_LEAD_TRIGGER" /d/node\ base/nodebase-main/src/components/node-selector.tsx

Ran terminal command: grep -r "useNodeStatus" /d/node\ base/nodebase-main/src/features/triggers/components --include="*.tsx" 2>/dev/null | head -5

Ran terminal command: find /d/node\ base/nodebase-main/src -path "*hooks*" -name "*use-node-status*" 2>/dev/null

Read [](file:///d/node%20base/nodebase-main/src/features/executions/hooks/use-node-status.ts)

Ran terminal command: git -C /d/node\ base/nodebase-main log --oneline -20

Ran terminal command: git -C /d/node\ base/nodebase-main diff --stat

Ran terminal command: grep -r "buildFacebookLeadSampleViews\|sampleResponse" /d/node\ base/nodebase-main/src --include="*.ts" --include="*.tsx" 2>/dev/null | head -15

Ran terminal command: grep -r "TODO\|FIXME\|BUG\|HACK" /d/node\ base/nodebase-main/src/features/triggers/components/facebook-lead-trigger --include="*.ts" --include="*.tsx" 2>/dev/null

Ran terminal command: grep -r "TODO\|FIXME\|BUG\|HACK" /d/node\ base/nodebase-main/src/app/api/triggers/facebook-lead --include="*.ts" 2>/dev/null

Ran terminal command: grep -r "TODO\|FIXME\|BUG\|HACK" /d/node\ base/nodebase-main/src/app/api/webhooks/facebook-leads --include="*.ts" 2>/dev/null

Excellent deep analysis. Now let me design the improvement plan.

Used tool: Agent

Ran terminal command: find /d/node\ base/nodebase-main/src -type f -name "*.ts" -o -name "*.tsx" | sort

Ran terminal command: ls /d/node\ base/nodebase-main/src/features/triggers/components/

Read [](file:///d/node%20base/nodebase-main/src/features/executions/components/google-sheets/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/node.tsx)

Read [](file:///d/node%20base/nodebase-main/src/app/workflow/sendwebhookdata/%5Btoken%5D/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/webhook/save-response/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/dialog.tsx)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/actions.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/executor.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/webhooks/facebook-leads/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/executions/components/google-sheets/executor.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/executions/components/google-sheets/actions.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/formatters.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/webhook/test/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/facebook-lead-trigger/formatters.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/facebook-lead/test/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/executions/lib/variable-tree.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/executions/types.ts)

Read [](file:///d/node%20base/nodebase-main/src/lib/encryption.ts)

Read [](file:///d/node%20base/nodebase-main/src/app/api/triggers/google-sheets/test/route.ts)

Read [](file:///d/node%20base/nodebase-main/src/lib/facebook-oauth.ts)

Read [](file:///d/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/actions.ts)

Here is Claude's plan:

# Node Improvement Plan — Webhook, Facebook Lead Trigger, Google Sheets

## Context

This plan covers improvements and bug fixes across all three nodes in the workflow automation tool. The nodes are: **Webhook Trigger**, **Facebook Lead Trigger**, and **Google Sheets** (execution node). Issues were discovered by deep-reading all source files across UI, API routes, executors, and data formatters.

---

## P0 — Critical Fixes (Data loss / broken functionality)

### P0-1 · Google Sheets: `columnMappings`, `sheetTitle`, `sourceVariable` lost on dialog reopen
**Problem:** These three fields are in the form schema but NOT in `GoogleSheetsNodeData` type. The dialog uses `(defaultValues as any).sheetTitle` / `as any` casts. When the dialog reopens, these fields may be missing, forcing the user to re-map columns every time.
**Fix:**
- Add `sheetTitle`, `sourceVariable`, `columnMappings` to `GoogleSheetsNodeData` in `node.tsx`
- Remove all `(defaultValues as any)` casts in `dialog.tsx` — use the proper typed fields
- Add same fields to `GoogleSheetsData` in `executor.ts` for type completeness

**Files:** `google-sheets/node.tsx`, `google-sheets/dialog.tsx`, `google-sheets/executor.ts`
**Complexity:** S

---

### P0-2 · Facebook Lead: Graph API version inconsistency (v20 vs v22)
**Problem:** `actions.ts` uses `v20.0`, `test/route.ts` uses `v22.0`, `facebook-leads/route.ts` uses `v20.0`. Sample captured in test may not match production data shape.
**Fix:** Create a single shared constant and replace all hardcoded version strings:
```ts
// src/config/constants.ts (or top of each file)
export const FB_GRAPH_API = "https://graph.facebook.com/v22.0";
```
Pin to `v22.0` (already in use in test route; newest maintained version).

**Files:** `facebook-lead-trigger/actions.ts`, `api/webhooks/facebook-leads/route.ts`, `api/triggers/facebook-lead/test/route.ts`
**Complexity:** S

---

### P0-3 · Facebook Lead: `triggerEvent` field is a complete no-op
**Problem:** The dialog exposes 3 trigger event options but the executor ignores `data` entirely and the webhook receiver never reads `triggerEvent`. It has zero effect. Misleads users.
**Fix:** Remove `triggerEvent` from the form schema, JSX, and `FacebookLeadTriggerFormValues` type in the dialog. The field never worked — safe to remove.

**Files:** `facebook-lead-trigger/dialog.tsx`
**Complexity:** S

---

### P0-4 · Google Sheets: `sourceVariable` selector shows hardcoded options instead of real upstream nodes
**Problem:** The "Source data" select in the dialog has 3 hardcoded options (`webhook`, `facebookLead`, `varName`) and never reads from `availableVariables` prop. A connected upstream trigger that isn't webhook or Facebook silently gets no source.
**Fix:** Replace hardcoded `<SelectItem>` entries with items derived from `Object.keys(availableVariables)`. Fall back to hardcoded list only when `availableVariables` is empty.

**Files:** `google-sheets/dialog.tsx`
**Complexity:** S

---

## P1 — Important UX Improvements

### P1-1 · Webhook: "Capture response" button is misleading — reads stored sample, not live webhook
**Problem:** Button label and copy say "we'll show the data instantly" but the API reads from an already-stored `sampleResponseRaw`. User must send a real webhook first, then click capture — the opposite of what the UI implies.
**Fix:**
- Rename button to **"Load last received webhook"**
- Show `lastSampleCapturedAt` timestamp next to the button ("Last received: 2 mins ago")
- When no sample exists: clear message "No webhook received yet — send a POST to the URL above first"
- Update Quick Steps copy to reflect the real 2-step flow

**Files:** `webhook-trigger/dialog.tsx`
**Complexity:** S

---

### P1-2 · Webhook: "Use in next nodes" panel shows hardcoded `email` / `name` examples
**Problem:** Variables panel always shows `{{webhook.body.email}}` and `{{webhook.body.name}}` regardless of what was actually captured.
**Fix:** When `sampleSimple` is populated, dynamically render each captured key as a variable reference with its example value. Show max 8, with "show all" toggle. Keep static examples only as empty-state placeholder.

**Files:** `webhook-trigger/dialog.tsx`
**Complexity:** S

---

### P1-3 · Webhook: Only 3 hardcoded named response slots ("Response A/B/C")
**Problem:** The save-name dropdown is hardcoded to exactly 3 options. The backend accepts any string — the limitation is UI-only.
**Fix:** Replace `<select>` with a free-text `<Input>` defaulting to `"Response A"`. Show existing saved response names as clickable chips to overwrite. Change `savingName` state type from union to `string`. No backend change needed.

**Files:** `webhook-trigger/dialog.tsx`
**Complexity:** S

---

### P1-4 · Google Sheets: Nested objects in saved response not accessible in column mapping
**Problem:** `node.tsx` only includes flat scalar keys (`string | number | boolean`) from `savedResponses.data`. Nested objects (e.g., `body.customer.email` in a Shopify webhook) are silently excluded from the mapping UI.
**Fix:** Replace flat key loop with a recursive flattener that emits dotted paths (max depth 3). The Handlebars executor already supports dot-notation paths so no executor change needed.
```ts
function flattenObject(obj, prefix = "") → { key: "customer.email", label: "customer.email", example: "..." }[]
```

**Files:** `google-sheets/node.tsx`
**Complexity:** S

---

### P1-5 · Google Sheets: Unmapped columns send empty strings with no user warning
**Problem:** Columns without a mapping silently write `""` to the sheet. Users don't know which columns will be blank before saving.
**Fix:** After columns load, compute `unmappedColumns = columns.filter(col => !columnMappings[col])`. Show a yellow alert banner: _"3 columns will be written as empty: Email, Phone, Company"_. Also show count in Save button tooltip.

**Files:** `google-sheets/dialog.tsx`
**Complexity:** S

---

### P1-6 · Google Sheets: "Send test row" has no confirmation — makes a real write with no warning
**Problem:** The button appends a real row to the live sheet. Users expect a safe preview but it's a real write with no undo.
**Fix:**
- Show an `AlertDialog` before sending: _"This will append a real row to [Sheet Name]. The following values will be written: [show resolved row]."_
- Rename button to **"Append test row to sheet"** to set correct expectations

**Files:** `google-sheets/dialog.tsx`
**Complexity:** M

---

### P1-7 · Facebook Lead: Page token failure silently falls back to user token
**Problem:** `facebook-leads/route.ts` does `pageToken = pageData?.access_token ?? userToken` — if page token fetch fails, silently continues with the user token which may lack permissions. Error is swallowed.
**Fix:** If `pageData` is null, log a structured error with workflowId + pageId, then `continue` (skip this lead entry) rather than proceeding. In `actions.ts` `fetchFacebookLeadForms`, throw with a helpful message about required permissions.

**Files:** `api/webhooks/facebook-leads/route.ts`, `facebook-lead-trigger/actions.ts`
**Complexity:** S

---

### P1-8 · Facebook Lead: Generic "Failed to load..." errors — Facebook API errors are swallowed
**Problem:** All catch blocks in the dialog show generic messages. `ky` throws `HTTPError` with Facebook's actual error (e.g., "Token has expired") in the response body.
**Fix:** In `actions.ts`, parse `HTTPError` response body and re-throw with Facebook's `error.message`. In dialog catch blocks, use `err instanceof Error ? err.message : "..."`.

**Files:** `facebook-lead-trigger/actions.ts`, `facebook-lead-trigger/dialog.tsx`
**Complexity:** S

---

## P2 — Nice-to-Have / Polish

### P2-1 · Webhook: Add description input field
**Problem:** Node canvas shows "When an HTTP POST is received" for all webhook nodes. `description` is already in `WebhookTriggerData` and used in the node — but the dialog has no input for it.
**Fix:** Add a `description` `<Input>` to the dialog (left column, top). Pass back via callback to `setNodes` in the node component.

**Files:** `webhook-trigger/dialog.tsx`, `webhook-trigger/node.tsx`
**Complexity:** S

---

### P2-2 · Webhook: Add "Send test webhook" button in dialog
**Problem:** Users must use Postman/curl to test — there's no built-in way to fire a test payload.
**Fix:** Add a collapsible "Send test payload" section with a `<Textarea>` pre-filled with sample JSON. On click, `fetch()` POST directly to the webhook URL (no new API route needed). Auto-trigger "Load last received" ~1s after to show the result.

**Files:** `webhook-trigger/dialog.tsx`
**Complexity:** S

---

### P2-3 · Webhook: HMAC signature verification (security)
**Problem:** Anyone with the webhook URL can trigger workflows — no secret or signature verification.
**Fix:**
- Add optional `webhookSecret` field to `WebhookTriggerData` + dialog (with "Generate" button)
- In route handler: if secret is set, verify `X-Webhook-Signature` header using `crypto.createHmac("sha256", secret)`. Reject with 401 if mismatch. Backward compatible (skip if no secret configured).
- Show the expected header format in the dialog

**Files:** `webhook-trigger/dialog.tsx`, `webhook-trigger/node.tsx`, `sendwebhookdata/[token]/route.ts`
**Complexity:** M

---

### P2-4 · Webhook: Webhook event history (last 10 events)
**Problem:** Each incoming webhook overwrites the single `sampleResponseRaw` slot. No history.
**Fix:** In the route handler, prepend new event to `nodeData.webhookHistory[]` capped at 10 entries. In dialog, add a history selector (timestamps list) that loads past events into the preview panel without an API call.

**Files:** `sendwebhookdata/[token]/route.ts`, `webhook-trigger/dialog.tsx`
**Complexity:** M

---

### P2-5 · Facebook Lead: `field.values[0]` rendered without null guard in dialog
**Problem:** `dialog.tsx` renders `field.values[0]` directly — can show `undefined` as text if the lead field has no values.
**Fix:** `{field.values[0] ?? "(empty)"}` — single-line fix.

**Files:** `facebook-lead-trigger/dialog.tsx`
**Complexity:** XS

---

### P2-6 · Facebook Lead: "Test connection" button for credential validation
**Problem:** No way to verify a Facebook token is still valid without triggering a full page/form reload. Users discover expired tokens only on workflow failure.
**Fix:** Add server action `testFacebookConnection(credentialId)` calling `GET /me?fields=id,name`. Add a "Test" button next to the credential selector in the dialog showing green (account name) or red (error message).

**Files:** `facebook-lead-trigger/actions.ts`, `facebook-lead-trigger/dialog.tsx`
**Complexity:** S

---

### P2-7 · Facebook Lead: Token expiry tracking and warning
**Problem:** Long-lived tokens (~60 days) expire silently. No expiry timestamp stored. No warning shown in UI.
**Fix:** During OAuth callback, store `expiresAt` (using Facebook's `expires_in` field). In `fetchFacebookPages`, check if within 7 days of expiry and include a warning. In dialog, show a yellow badge: _"Token expires in 3 days — reconnect soon."_

**Files:** `api/auth/facebook/callback/route.ts`, `facebook-lead-trigger/actions.ts`, `facebook-lead-trigger/dialog.tsx`
**Complexity:** M

---

### P2-8 · Google Sheets: Read action configuration UI
**Problem:** The read action has no per-column configuration — returns a raw 2D array with no row filter or output mapping. Downstream nodes must index manually.
**Fix:** When `action === "read"`, show: (a) "Find row where [column] = [value]" filter, (b) output field mapping (column → variable name). Add `readFilter` and `readOutputMapping` to node data type. Implement row-filter logic in executor.

**Files:** `google-sheets/dialog.tsx`, `google-sheets/node.tsx`, `google-sheets/executor.ts`
**Complexity:** L

---

## Recommended Execution Order

| # | Item | Priority | Complexity | Files |
|---|------|----------|------------|-------|
| 1 | P0-2 — Pin Facebook API version | P0 | S | actions.ts, 2 routes |
| 2 | P0-3 — Remove no-op triggerEvent | P0 | S | dialog.tsx |
| 3 | P0-1 — Fix GoogleSheetsNodeData type | P0 | S | node + dialog + executor |
| 4 | P0-4 — Dynamic sourceVariable selector | P0 | S | dialog.tsx |
| 5 | P1-1 — Fix webhook capture button copy | P1 | S | dialog.tsx |
| 6 | P1-2 — Dynamic webhook variables panel | P1 | S | dialog.tsx |
| 7 | P1-3 — Free-text response name input | P1 | S | dialog.tsx |
| 8 | P1-5 — Unmapped columns warning | P1 | S | dialog.tsx |
| 9 | P1-4 — Flatten nested fields in mapping | P1 | S | node.tsx |
| 10 | P1-7 — Facebook page token failure | P1 | S | route.ts, actions.ts |
| 11 | P1-8 — Facebook error messages | P1 | S | actions.ts, dialog.tsx |
| 12 | P1-6 — Test row confirmation dialog | P1 | M | dialog.tsx |
| 13 | P2-5 — field.values[0] null guard | P2 | XS | dialog.tsx |
| 14 | P2-1 — Webhook description field | P2 | S | dialog + node |
| 15 | P2-2 — Send test webhook button | P2 | S | dialog.tsx |
| 16 | P2-6 — Facebook test connection button | P2 | S | actions + dialog |
| 17 | P2-3 — HMAC signature verification | P2 | M | dialog + node + route |
| 18 | P2-4 — Webhook event history | P2 | M | route + dialog |
| 19 | P2-7 — Facebook token expiry tracking | P2 | M | callback + actions + dialog |
| 20 | P2-8 — Google Sheets read action UI | P2 | L | dialog + node + executor |

---

## Verification / Testing

After implementing each item:
- **P0-1:** Open a saved Google Sheets node → close dialog → reopen → verify columnMappings, sheetTitle, and sourceVariable are still populated
- **P0-2:** Trigger a Facebook lead → check server logs confirm single API version used throughout
- **P0-3:** Confirm no `triggerEvent` field appears in the Facebook dialog
- **P0-4:** Connect a non-webhook trigger to Google Sheets → confirm the correct source appears in the dropdown
- **P1-1:** Open webhook dialog with no captured data → verify correct empty-state message; capture a webhook → verify timestamp shows
- **P1-2:** Capture a webhook with custom fields → verify those fields appear dynamically in the variables panel
- **P1-3:** Save a webhook response with a custom name → verify it appears as a badge and loads correctly in Google Sheets mapping
- **P1-4:** Use a nested webhook payload (e.g., `{customer: {email: "..."}}`) → verify `customer.email` appears in Google Sheets column mapping dropdown
- **P1-5:** Configure a Google Sheets node with some unmapped columns → verify yellow warning shows correct count and column names
- **P1-6:** Click "Append test row" → verify confirmation dialog appears showing resolved values before writing
- **P1-7/P1-8:** Revoke Facebook permissions → trigger webhook → verify structured error logged and no silent fallback

Now I have everything I need. Let me implement all changes in order.**P0-2: Pin Facebook API to v22.0 across all files****P0-3: Remove no-op `triggerEvent` from Facebook Lead dialog**Now remove `triggerEvent` from the form defaults and reset:Now remove the `triggerEvent` FormField JSX block:**P0-1: Fix `GoogleSheetsNodeData` type — add missing fields**Add the fields to the executor type too:Now remove the `as any` casts in the dialog:**P0-4: Replace hardcoded `sourceVariable` selector with dynamic `availableVariables`**All P0s done. Now P1 fixes. **P1-1: Fix webhook capture button copy and empty-state**


Now fix the empty-state text and Quick Steps copy:**P1-2: Replace hardcoded variables panel with dynamic fields from captured response**



**P1-3: Replace Response A/B/C dropdown with free-text input + chips**


Also fix the placeholder in the raw textarea that still mentions "Capture response":**P1-5: Unmapped columns warning in Google Sheets dialog****P1-4: Flatten nested objects in `savedResponseFields` (Google Sheets node)****P1-7: Fix silent page token fallback in Facebook webhook receiver****P1-8: Surface Facebook API errors in `actions.ts` and dialog**Now add a helper and wrap each API call to extract Facebook's error message:Wrap the API calls to use `parseFacebookError`:Now update the dialog's catch blocks to surface the real error message:**P1-6: Add confirmation `AlertDialog` before Google Sheets test row append.** Let me check what AlertDialog components are available:

Searched for files matching `src/components/ui/alert-dialog.tsx`

Good. Now update the dialog to add the confirmation flow:Now add state for the confirmation dialog and refactor `handleSendTestRow` to show it first:Now refactor `handleSendTestRow` to show the confirmation dialog instead of sending immediately:Now add the AlertDialog JSX before the closing `</Dialog>` tag and update the footer button label:Now add the AlertDialog JSX — it needs to render outside the main Dialog:Close the outer fragment at the end:All P0 and P1 done. Now P2 fixes. **P2-5: `field.values[0]` null guard (XS)****P2-1: Add description input field to Webhook dialog + node**

The `description` field is already in `WebhookTriggerData` and used in the node. I need to add it to the dialog's `Props`, wire a state, and add the input. The dialog currently has no submit/onSubmit mechanism — it just saves responses. The description needs to update the node via a callback.Add description state and reset it when dialog opens:Now find the Webhook URL section in the left column and add the description input just before it:Now wire `onDescriptionChange` in the node:**P2-2: Add "Send test webhook" button in Webhook dialog**

I need to add a collapsible "Send test payload" section. Let me find the right insertion point — after the "Works with" section in the left column:


Add test payload state in the dialog:Add the handler function. Find where `copyToClipboard` is defined and add after it:Now add the test payload UI section in the left column, right before the "Works with" section. I also need to import `ChevronDownIcon` — let me check if it's already imported:

Searched for regex `ChevronDown`

**P2-6: Add "Test connection" button to Facebook Lead dialog**

Add a `testFacebookConnection` server action and a button next to the credential selector:Now add the import and a "Test" button in the dialog next to the credential selector:Add state and handler for the connection test:

---

*Conversation compacted*  Now implementing P2-3: HMAC webhook secret. I'll update all three files.

Here’s the clean remaining backlog across the phases we’ve worked on.

Phase 1
Almost done. What remains is platform safety, not core security.

Remaining:

Workflow validation polish
validate branch handles for IF
validate merge topology
validate trigger-specific config more deeply
validate unreachable/dead-end paths more clearly
Error taxonomy completion
normalize provider errors
mark retryable vs non-retryable more consistently
surface structured error codes in UI/API responses
Cleanup
fix the two existing TypeScript errors in:
stripe route
sendwebhookdata route
Phase 2
This is the biggest remaining area. Core branching now exists, but the workflow engine still needs more control-flow depth and better data UX.

Remaining:

Add Switch
Add Loop
Add Delay Until
Improve Merge
explicit merge strategies
combine selected node outputs
clearer branch-join behavior
Improve data mapping UX
field-level picker, not only node-level references
better schema-aware previews
structured references instead of raw text insertion everywhere
Extend reference picker to more nodes
Gmail
Send Email
Slack
Discord
Telegram
WhatsApp
HTTP Request
Google Drive
Instagram
Facebook Page
Runtime improvements
per-edge data semantics
stronger branch replay/debugging
clearer node input/output inspection for branched runs
Phase 3
The connector framework foundation is in place. What remains is turning it from “shared helper layer” into a real connector system.

Remaining:

Expand connector definitions
action definitions
trigger definitions
config schema
output schema
test connection contract
refresh lifecycle metadata
provider error mapping
Move more provider logic into src/integrations/*
less feature-local API logic
more shared provider execution helpers
Standardize UI from connector metadata
dialog copy
setup requirements
credential prompts
provider labels/icons
Move toward connector-definition-driven runtime
less hardcoded node behavior
more shared execution contracts per connector
Phase 4 and beyond
Still not started as full phases.

Remaining:

Phase 4: Trigger system upgrade
first-class trigger gateway
canonical trigger event format
trigger-node targeting everywhere
polling/manual/test trigger consistency
Phase 5: Variable system and data mapping
structured references
output explorer
field picker UX
template validation
Phase 6: Observability
execution timeline
replay
dead-letter/retry visibility
provider response tracing
Phase 7: Versioning and environments
draft/published versions
immutable execution snapshots
environment-scoped credentials
Phase 8: Multi-tenancy
organizations
memberships
projects
permissions
quotas
Phase 9: Advanced AI/runtime
approval nodes
extractor/router/classifier nodes
schema-constrained AI outputs
tool-calling patterns
Best execution order from here

Fix the 2 existing TypeScript errors
Add Switch
Improve field-level data mapping
Add Delay Until
Add Loop
Strengthen connector definitions
Start trigger gateway redesign
Add workflow versioning
Build observability/replay
Add org/workspace model