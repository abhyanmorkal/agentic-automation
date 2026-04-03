# Closed Beta Launch Plan

## Purpose

This document defines what "ready for launch" means for the current product and
what must be finished before we invite real agency users into a closed beta.

This is not a public launch plan.

The current product is in the right shape for:

- internal demos
- founder-led demos
- technical validation with friendly users

The current product is not yet in the right shape for:

- wide public release
- self-serve onboarding at scale
- paid production usage without support

## Current Readiness

Estimated readiness:

- Internal demo: 80-85%
- Closed beta: 65-70%
- Public paid launch: 40-50%

Main reasons:

- core workflow editing exists
- runtime now supports trigger-aware execution
- node-level execution persistence exists
- OAuth and webhook hardening are in place
- control flow now includes `IF`, `Delay`, and `Merge`
- connector framework foundation exists

Main gaps:

- workflow engine still needs more control-flow depth
- field-level data mapping UX is still weak
- workflow debugging and replay are not yet strong enough
- connector definitions are not fully standardized
- product operations and onboarding are still thin

## Launch Goal

The immediate launch target is:

- closed beta with 3-5 friendly agencies

The success criteria for this closed beta are:

- users can build and run real automations without engineering help for every step
- failures are understandable and debuggable
- webhook and OAuth flows are safe
- top connectors used in beta are stable
- the team can support issues quickly

## Scope For Closed Beta

Closed beta should be intentionally narrow.

Supported workflow patterns:

- trigger -> action
- trigger -> `IF` -> branch action
- trigger -> `Delay` -> action
- trigger -> branch -> `Merge` -> action
- trigger -> Google/Meta/app action chains

Supported triggers for beta:

- Manual Trigger
- Webhook
- Facebook Lead Ads
- Google Form
- Schedule Trigger

Supported action categories for beta:

- HTTP Request
- Google Sheets
- Gmail
- Send Email
- Slack/Discord/Telegram if stable in testing
- Meta actions used by agency workflows

Not yet promised for beta:

- large-scale looping
- advanced multi-branch routing beyond current control-flow set
- complex merge strategies
- rich self-serve schema mapping
- versioned publishing model
- organization/workspace permissions

## Hard Launch Gates

These are non-negotiable for closed beta.

### 1. Build And Type Safety

Must be true:

- `npx tsc --noEmit` passes
- no known blocking runtime errors remain
- schema and Prisma client are up to date

Current blockers:

- [stripe route](/D:/node%20base/nodebase-main/src/app/api/webhooks/stripe/route.ts)
- [sendwebhookdata route](/D:/node%20base/nodebase-main/src/app/workflow/sendwebhookdata/[token]/route.ts)

Definition of done:

- both files compile cleanly
- no new type regressions are introduced by recent Phase 1-3 work

### 2. Core Runtime Reliability

Must be true:

- workflows execute only the intended reachable path
- branch routing works correctly for `IF`
- `Delay` resumes correctly
- `Merge` does not create obvious path duplication or skipped downstream execution
- execution records are created and visible per node

Definition of done:

- manual test flows pass repeatedly
- at least one automated integration test covers each supported control-flow pattern

### 3. Security

Must be true:

- OAuth state verification is enforced
- webhook tokenization is enforced
- provider signature verification works where required
- credentials cannot be attached across users
- no raw workflow execution endpoint is exposed without proper checks

Definition of done:

- re-test OAuth callback flows
- re-test webhook routes using invalid signatures and invalid tokens
- confirm unauthorized requests fail safely

### 4. User Experience

Must be true:

- users can understand why a workflow cannot run
- users can inspect execution failures
- users can insert upstream references in common node dialogs
- the workflow builder clearly shows what is beta-ready

Definition of done:

- validation errors are user-readable
- execution detail page shows enough context to debug common failures
- top beta nodes have acceptable setup UX

## Workstreams

## Workstream A: Stabilize Core Engineering

### Tasks

- Fix the two existing TypeScript errors
- Re-run typecheck after each fix
- Re-run Prisma validation and client generation after schema changes
- Confirm migrations apply cleanly in staging and production-like environments

### Deliverables

- green `npx tsc --noEmit`
- green Prisma schema validation
- migration log for latest schema changes

### Owner Notes

This is the first thing to finish because it reduces risk everywhere else.

## Workstream B: Complete The Minimum Runtime For Beta

### Tasks

- Add `Switch`
- Improve `Merge` semantics or document current limitations clearly
- Add tests for:
  - trigger -> action
  - trigger -> `IF` -> true branch
  - trigger -> `IF` -> false branch
  - trigger -> `Delay` -> action
  - trigger -> branch -> `Merge` -> action
- confirm per-node execution input/output logging is correct for control-flow runs

### Deliverables

- working `Switch` node
- stable branch routing
- documented limitations for `Merge`
- passing integration tests for core flow patterns

### Beta Standard

We do not need full `Loop` before closed beta.

We do need branch logic to feel trustworthy.

## Workstream C: Improve Data Mapping UX

### Problem

The engine supports node-output references, but the current mapping UX still asks
too much from users. That is acceptable for internal use, but weak for agency
beta users.

### Tasks

- extend reference picker to more node dialogs
- support field-level picking for common node outputs
- improve template hints and examples
- highlight variable/reference mistakes earlier in setup

### Priority Node Dialogs

- Google Sheets
- Gmail
- Send Email
- HTTP Request
- Slack
- Discord
- Telegram
- WhatsApp
- Facebook Page
- Instagram

### Deliverables

- reference insertion in all main beta nodes
- field-level reference support for the most used beta paths
- clearer descriptions in dialogs

## Workstream D: Connector Readiness

### Goal

Narrow the connector set and make those connectors stable, instead of trying to
support too many integrations at once.

### Beta Connector Set

Priority connectors:

- Webhook
- HTTP Request
- Google Sheets
- Gmail
- Facebook Lead Ads
- Meta actions used in target demos

Optional if stable:

- Send Email
- Slack
- Discord
- Telegram

### Tasks

- verify credential loading and refresh behavior
- verify reconnect flow for OAuth-based credentials
- verify user/session ownership checks
- improve connector setup messaging in dialogs
- move remaining provider-specific setup logic toward shared integration helpers

### Deliverables

- connector QA checklist completed for each beta connector
- known limitations documented
- unsupported providers hidden or clearly marked as beta/coming soon

## Workstream E: Observability And Supportability

### Problem

Closed beta users will hit bad payloads, bad credentials, missing fields, and
provider API failures. We need enough observability to support them quickly.

### Tasks

- improve execution detail readability
- make node input/output/error data easier to inspect
- ensure structured errors surface in UI
- prepare a support workflow for failed executions
- add basic error monitoring if not already configured

### Deliverables

- usable execution detail view
- reproducible support flow for "workflow failed" reports
- basic monitoring and logs available to the team

## Workstream F: Product And Onboarding

### Goal

Closed beta users should know what the product can do and what is still limited.

### Tasks

- define the beta promise clearly
- create 3-5 starter templates for agencies
- add onboarding copy
- add empty states and setup hints
- define what support channel beta users should use

### Suggested Templates

- Facebook Lead Ads -> Google Sheets
- Webhook -> OpenAI -> Slack
- Google Form -> Gmail reply flow
- Facebook Lead Ads -> Delay -> follow-up action
- Manual Trigger -> HTTP Request -> Google Sheets

### Deliverables

- onboarding message
- starter templates
- beta support instructions

## Test Plan

These scenarios must be manually tested before beta launch.

### Workflow Execution

- manual trigger executes a simple action flow
- webhook trigger executes a simple action flow
- Facebook Lead Ads trigger reaches downstream nodes
- Google Form trigger reaches downstream nodes
- schedule trigger executes on expected cadence

### Control Flow

- `IF` routes true branch only
- `IF` routes false branch only
- `Delay` resumes and continues
- `Merge` waits for active incoming paths before continuing

### Credentials

- Google OAuth credential connect works
- Google OAuth refresh works for expired tokens
- Meta credential usage works for configured actions
- invalid credentials fail with a clear error

### Error Handling

- missing required field fails before execution when possible
- invalid webhook signature fails safely
- invalid OAuth callback state fails safely
- provider API error is visible in execution logs

### UX

- validation messages are understandable
- users can inspect failed nodes
- users can insert upstream references without guessing syntax

## Release Checklist

This is the literal checklist to complete before inviting beta users.

### Engineering

- [x] Fix all known TypeScript errors
- [x] Verify latest Prisma migration applied in target environment
- [x] Add `Switch`
- [ ] Add tests for the main execution patterns
- [ ] Verify no blocking runtime regressions in control flow

### Security

- [ ] Re-test OAuth hardening
- [ ] Re-test webhook verification
- [ ] Re-test credential ownership checks
- [ ] Verify no unsafe execution path remains exposed

### UX

- [ ] Improve reference picker coverage
- [ ] Confirm validation errors are understandable
- [ ] Confirm execution detail is usable for debugging
- [ ] Hide or label unsupported/unfinished nodes clearly

### Connectors

- [ ] QA Webhook
- [ ] QA HTTP Request
- [ ] QA Google Sheets
- [ ] QA Gmail
- [ ] QA Facebook Lead Ads
- [ ] QA priority Meta actions

### Operations

- [ ] Confirm deployment flow
- [ ] Confirm environment variables
- [ ] Confirm logging/monitoring
- [ ] Confirm backup/recovery basics
- [ ] Confirm team support path

### Product

- [ ] Prepare onboarding copy
- [ ] Prepare templates
- [ ] Prepare beta scope note
- [ ] Select first beta agencies

## Known Risks

These are acceptable for closed beta only if they are documented and monitored.

### Merge Semantics

`Merge` is useful now, but still early. It should be treated as beta behavior,
not as a final enterprise-grade branch-join engine.

### Mapping UX

Field-level mapping is still behind where non-technical users will want it.
This is one of the biggest adoption risks in beta.

### Connector Surface Area

The product already touches many integrations. The risk is spreading QA effort
too thin. The right move is to narrow the beta connector promise.

### Missing Platform Layers

The following are still not launch blockers for closed beta, but they are future
public launch blockers:

- workflow versioning
- execution replay
- organization/workspace model
- deeper connector-definition standardization

## 2-Week Execution Plan

## Week 1

### Day 1-2

- fix TypeScript errors
- confirm Prisma state
- confirm current control-flow paths work end-to-end

### Day 3-4

- implement `Switch`
- add integration coverage for control-flow cases

### Day 5

- improve execution detail view and error surfacing
- document current runtime limitations

## Week 2

### Day 6-7

- improve variable/reference picker coverage
- improve field-level mapping in highest-value nodes

### Day 8-9

- QA top beta connectors
- test credential reconnect and expired-token behavior

### Day 10

- finalize onboarding copy and starter templates
- stage beta workflows for demos

### Day 11-12

- full regression pass across target beta flows
- fix any launch blockers

### Day 13-14

- deploy
- smoke test in production-like environment
- invite first beta users

## Closed Beta Exit Criteria

Closed beta starts when all of these are true:

- TypeScript passes
- migrations are applied cleanly
- top beta workflows execute reliably
- security checks pass
- users can debug common failures
- top beta connectors are QAed
- the team has onboarding and support ready

## After Closed Beta

The next priorities after beta starts should be:

- richer field-level mapping
- `Loop`
- `Delay Until`
- workflow versioning
- execution replay
- stronger connector-definition standardization

These are the features that move the product from promising beta to stronger
production platform.
