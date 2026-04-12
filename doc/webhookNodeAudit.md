# Webhook Node Audit

## Status

- Node: Webhook Trigger
- Category: Trigger
- Current readiness: `Ready`
- Beta priority: High
- Audit date: 2026-04-12

## What The Node Does

The webhook trigger creates a signed tokenized endpoint for a workflow node and
starts a workflow execution when an external service sends a request to that
endpoint.

Current implementation covers:

- token-based webhook endpoint per workflow node
- optional HMAC verification using `X-Webhook-Signature`
- JSON, form-urlencoded, multipart, and raw text request parsing
- request history storage on the node
- sample capture for downstream mapping
- saved sample responses for design-time mapping

Main files reviewed:

- [src/features/triggers/components/webhook-trigger/dialog.tsx](/D:/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/dialog.tsx)
- [src/features/triggers/components/webhook-trigger/node.tsx](/D:/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/node.tsx)
- [src/features/triggers/components/webhook-trigger/formatters.ts](/D:/node%20base/nodebase-main/src/features/triggers/components/webhook-trigger/formatters.ts)
- [src/app/workflow/sendwebhookdata/[token]/route.ts](/D:/node%20base/nodebase-main/src/app/workflow/sendwebhookdata/[token]/route.ts)
- [src/app/api/triggers/webhook/test/route.ts](/D:/node%20base/nodebase-main/src/app/api/triggers/webhook/test/route.ts)
- [src/app/api/triggers/webhook/save-response/route.ts](/D:/node%20base/nodebase-main/src/app/api/triggers/webhook/save-response/route.ts)

## Deep-Dive Checklist

### Product Fit

- [x] High-value beta trigger
- [x] Useful for agency and integration-heavy workflows
- [x] Narrow enough to keep in beta scope
- [ ] Fully self-serve for non-technical users

### Setup Experience

- [x] Node purpose is understandable
- [x] Webhook URL is easy to copy
- [x] Basic test payload flow exists
- [x] Secret-signing setup is fully explained for non-technical users
- [x] Empty state clearly teaches capture and mapping end to end

### Validation

- [x] Invalid token fails safely
- [x] Missing or invalid signature fails safely when secret is configured
- [x] Unauthorized capture/save endpoints fail safely
- [x] Invalid JSON request is now rejected with `400`
- [x] UI pre-validates test payload before sending

### Data Mapping

- [x] `{{webhook.body.*}}` mapping is supported
- [x] raw and advanced sample views exist
- [x] saved responses are available downstream
- [x] Nested field mapping is available in the field explorer
- [x] Query/header mapping is taught clearly in the UI

### Runtime Behavior

- [x] Request history is stored
- [x] latest sample is persisted on node data
- [x] workflow execution is started from webhook request
- [x] multipart files are recorded as metadata
- [x] event-id based deduplication exists for common provider headers

### Error Handling

- [x] invalid signature returns `401`
- [x] invalid token returns `400`
- [x] webhook node not found returns `404`
- [x] test sender now surfaces backend errors instead of always showing success
- [x] provider-style retry and signing expectations are documented in UI

### Observability

- [x] recent history list exists
- [x] simple, advanced, and raw response views exist
- [x] last received timestamp is visible
- [x] per-event metadata summary is shown in history list
- [x] request size and parse type are visible in the sample UI

### Security

- [x] tokenized endpoint is enforced
- [x] optional HMAC verification is enforced
- [x] timing-safe signature comparison is used
- [ ] no replay protection beyond token/signature
- [x] payload-size expectation is documented in the product behavior

## Bugs Found

### Fixed In This Pass

- `P1`: Invalid JSON requests were being parsed as `{}` and could still trigger
  a workflow execution. The webhook route now returns `400 Invalid JSON body`
  instead of silently accepting malformed JSON.
- `P2`: The built-in "Send test payload" action always showed success even when
  the webhook endpoint returned an error. The dialog now checks the response and
  shows the backend error.
- `P2`: The built-in test sender did not validate JSON before sending. The
  dialog now blocks invalid JSON client-side and shows a clear error.
- `P2`: Loading an item from event history restored only the body for advanced
  view, which made advanced/raw inspection misleading. The dialog now rebuilds
  proper sample views from the selected history item.
- `P3`: The dialog had broken text rendering for a few labels such as
  `Sending...`, `Saving...`, and the event history separator. Those strings are
  now cleaned up.
- `P2`: Event history lacked enough metadata to distinguish similar requests.
  It now shows method, parse type, and payload size.
- `P2`: Nested payload paths were not discoverable from the webhook UI. The
  dialog now includes a field-path explorer with one-click copy for mapping.
- `P2`: Duplicate deliveries from providers could re-run the same workflow with
  no protection. The route now performs lightweight deduplication when common
  provider event-id headers are present.
- `P2`: Oversized webhook payloads had no explicit guard. The route now rejects
  payloads larger than 1 MB with `413`.

### Still Open

- `P1`: The current duplicate-delivery protection is header-based and best
  effort. Providers without stable event ids can still trigger repeated runs.
- `P2`: Full replay protection and long-window idempotency are not yet enforced
  at the execution platform level.

## UI/UX Review

### What Works Well

- The two-column dialog is easy to scan.
- The webhook URL and secret are front and center.
- The field-path explorer makes mapping much easier for nested payloads.
- The history panel is now much more useful for debugging and support.

### UX Gaps

- The built-in flow is much lighter now, but replay/idempotency still remains a
  backend concept rather than a user-facing setting.
- Saved responses are useful, but still slightly advanced for non-technical
  users who have not yet worked with variable paths.

### Recommended UI Improvements

- Add a visible note when a selected sample came from history instead of the
  latest event.
- Consider inline examples for common signed-provider setups.
- Consider moving saved responses behind a smaller "advanced" affordance if new
  users still find the panel noisy.

## Engineering Improvement Tasks

### Short Term

- Add automated tests for:
  - valid JSON webhook
  - invalid JSON webhook
  - signed webhook success
  - signed webhook failure
  - multipart webhook capture
  - repeated webhook delivery behavior
- Keep formatter and route behavior covered as webhook capabilities expand.

### Medium Term

- Expand dedupe from best-effort header matching to execution-level idempotency.
- Add structured request summaries in execution detail view.

## Final Recommendation

Include webhook in beta. It is now strong enough for beta use, with the main
remaining investment area being stronger platform-level replay protection.
