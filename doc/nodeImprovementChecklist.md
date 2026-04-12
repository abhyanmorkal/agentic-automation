# Node Audit And Improvement Checklist

## Purpose

This checklist is for deep review of every workflow node in the product.

The goal is not only to confirm that a node "works" once. The goal is to
understand:

- how the node is supposed to work
- how it behaves in real execution
- where the UX is confusing
- where validation is weak
- where data mapping breaks down
- what bugs exist today
- what should be improved before wider beta usage

This document should be used node by node during product review, QA, and
engineering improvement passes.

## How To Use This Document

For each node:

1. Review the implementation and current UI behavior.
2. Test the node in a real workflow, not only in isolation.
3. Test happy path, invalid input, missing credentials, and retry scenarios.
4. Record bugs, severity, and reproduction steps.
5. Record UX improvements and engineering follow-up items separately.
6. Decide whether the node is:
   - beta ready
   - beta ready with limitations
   - not ready for beta

## Node Review Output Format

Every node review should produce the following:

- Node name
- Category
- Owner
- Current readiness
- Summary of how the node works
- Supported inputs
- Produced outputs
- Credential requirements
- Known limitations
- Confirmed bugs
- UX issues
- Reliability issues
- Security concerns
- Improvement tasks
- Final recommendation

## Readiness Status

Use one status for every node:

- `Ready`: safe to include in beta
- `Limited`: usable in beta with clearly documented limits
- `Blocked`: should not be promised in beta yet

## Severity Scale For Bugs

- `P0`: data loss, security issue, wrong execution, or production outage risk
- `P1`: major workflow failure or high-likelihood broken user path
- `P2`: partial failure, confusing UX, or weak validation
- `P3`: minor polish issue, copy issue, or low-risk inconsistency

## Universal Node Deep-Dive Checklist

Every node should be checked against all of the following.

### 1. Product Fit

- Does this node belong in the beta promise?
- Is the node important for agency workflows?
- Is the node stable enough to support real users?
- Is the node over-scoped for current beta needs?

### 2. Setup Experience

- Can a user understand what the node does from the name alone?
- Is the description clear and accurate?
- Are required fields obvious?
- Are optional fields clearly marked?
- Does the dialog guide the user toward a valid setup?
- Are examples or helper text needed?
- Are unsupported fields or advanced settings hidden or clearly labeled?

### 3. Validation

- Are missing required fields caught before execution?
- Are invalid field formats caught early?
- Are credential errors shown before runtime when possible?
- Are reference or variable mistakes surfaced clearly?
- Are provider-specific constraints validated properly?

### 4. Data Mapping

- Can users insert upstream references easily?
- Does field-level mapping work where users expect it?
- Are arrays, nested objects, and optional fields handled correctly?
- Does the node expose output fields that are actually useful downstream?
- Are output labels understandable to non-technical users?

### 5. Runtime Behavior

- Does the node execute successfully on valid input?
- Does it send the correct payload to the provider or internal runtime?
- Does it return the expected output shape?
- Does it behave correctly when used after `IF`, `Delay`, `Merge`, or `Switch`?
- Does it behave correctly when upstream data is missing or null?
- Does it avoid duplicate execution?

### 6. Error Handling

- Are provider errors visible in execution logs?
- Are timeout errors distinguishable from validation errors?
- Are auth failures distinguishable from bad input failures?
- Does the node fail safely without corrupting downstream state?
- Can a user understand how to recover from the error?

### 7. Credentials And Permissions

- Does the node require credentials?
- Does credential selection work correctly?
- Are credentials scoped to the correct user?
- Does reconnect flow work after expiry or revocation?
- Are invalid or missing credentials handled safely?

### 8. Observability

- Are node inputs visible in execution details where safe?
- Are outputs visible and usable for debugging?
- Are sensitive values redacted where required?
- Is the error payload readable?
- Can support reproduce failure from the logged information?

### 9. Security

- Does the node expose any unsafe input surface?
- Are secrets protected?
- Are webhook or callback checks enforced where relevant?
- Can one user accidentally use another user's credentials or resources?
- Does the node allow untrusted payloads to trigger unsafe actions?

### 10. Documentation

- Is the node documented internally?
- Are known limitations documented?
- Is the expected input/output shape documented?
- Is there a working example workflow for this node?

## Node Review Template

Copy this block for each node audit.

```md
## Node: <Node Name>

- Category:
- Owner:
- Status: `Ready` | `Limited` | `Blocked`
- Beta priority: High | Medium | Low

### How It Works Today

- Trigger/event/action summary:
- Expected inputs:
- Expected outputs:
- Credential model:
- Dependencies:

### Happy Path Checks

- [ ] Node can be added to workflow
- [ ] Node can be configured without confusion
- [ ] Validation catches bad setup before runtime
- [ ] Node executes successfully with valid data
- [ ] Output is visible and usable downstream

### Failure Path Checks

- [ ] Missing required field produces clear error
- [ ] Invalid credentials produce clear error
- [ ] Provider/API failure is visible in logs
- [ ] Retry or rerun behavior is safe
- [ ] Downstream nodes do not receive misleading data

### Data Mapping Checks

- [ ] Reference picker works in all important fields
- [ ] Nested data can be mapped if needed
- [ ] Output keys are understandable
- [ ] Common downstream use cases are supported

### Bugs

- [ ] No confirmed bugs

Confirmed bugs:

- `P?`:
- `P?`:

### Improvements

- UX:
- Validation:
- Runtime:
- Logging:
- Documentation:

### Recommendation

- Include in beta? Yes / No / Limited
- Conditions to include:
- Follow-up owner:
```

## Priority Audit Order

Start with the nodes that most affect beta workflows.

### Tier 1: Must Deep-Dive First

- Manual Trigger
- Webhook
- Schedule Trigger
- Facebook Lead Ads
- Google Form
- HTTP Request
- Google Sheets
- Gmail
- Send Email
- Meta actions used in target agency flows
- `IF`
- `Delay`
- `Merge`
- `Switch`

### Tier 2: Deep-Dive Next

- Slack
- Discord
- Telegram
- WhatsApp
- Facebook Page
- Instagram

### Tier 3: Review Only If Still In Scope

- Any experimental node
- Any hidden node
- Any node without active beta usage

## Node-Specific Deep-Dive Checklists

Use the universal checklist above for every node, then add the node-specific
checks below.

## Manual Trigger

### What To Verify

- Can a workflow be run manually without hidden prerequisites?
- Is the trigger discoverable and easy to use?
- Does it create a clean execution record?
- Can test payload or sample inputs be provided when needed?

### Common Bug Patterns

- trigger starts without expected default input
- execution record missing trigger context
- manual test run behaves differently from real runtime path

## Webhook

### What To Verify

- Webhook URL generation works correctly
- tokenized or protected access is enforced
- payload arrives in expected structure
- headers, body, and query params are captured correctly
- webhook can trigger downstream nodes repeatedly without duplication
- invalid token or invalid signature fails safely
- documentation/example payload is available for users

### Common Bug Patterns

- webhook token mismatch not handled clearly
- request body shape differs between test and production
- duplicate deliveries create duplicate executions
- missing headers are not surfaced clearly

## Schedule Trigger

### What To Verify

- scheduled job fires at expected cadence
- timezone behavior is correct
- disabled workflows do not keep running
- missed runs or delayed runs are visible to the team

### Common Bug Patterns

- timezone mismatch
- duplicate scheduled runs
- disabled workflow still queued
- no visibility when scheduler misses an execution

## Facebook Lead Ads

### What To Verify

- OAuth connection works
- page/account selection works
- webhook or polling integration receives real leads
- lead payload fields are mapped correctly
- token refresh works after expiry
- permission failures are readable

### Common Bug Patterns

- stale page permissions
- missing lead fields in output mapping
- expired token breaks silently
- reconnect flow does not restore working state cleanly

## Google Form

### What To Verify

- trigger receives submissions consistently
- form response payload contains expected fields
- field names are stable enough for downstream mapping
- reconnect and permission scopes work correctly

### Common Bug Patterns

- output keys differ from displayed field labels
- form edits break downstream mappings
- missing scope causes runtime-only failure

## HTTP Request

### What To Verify

- method, URL, headers, query params, and body all work
- JSON and non-JSON payloads behave correctly
- auth headers can be configured safely
- timeouts and non-200 responses are logged clearly
- output body is available for downstream nodes

### Common Bug Patterns

- wrong content-type handling
- body serialization issues
- masked error response hides useful debugging detail
- response parsing breaks on empty body

## Google Sheets

### What To Verify

- OAuth connection works
- spreadsheet selection works
- sheet selection works
- read/write operations target the correct sheet and range
- row insertion and update behavior is predictable
- mapped values preserve expected types

### Common Bug Patterns

- wrong sheet or range selected silently
- header mapping mismatch
- empty values overwrite valid sheet data unexpectedly
- refresh token expiry creates confusing runtime errors

## Gmail

### What To Verify

- credential connect and refresh work
- send action works with subject, body, recipients, and optional fields
- HTML/plain-text handling is clear
- mapped variables render correctly in outgoing messages
- provider-side send failure is visible to the user

### Common Bug Patterns

- invalid recipient format not validated early
- HTML body rendering differs from preview expectation
- token expiry surfaced as generic provider error

## Send Email

### What To Verify

- send flow works without OAuth if this node uses internal mail transport
- sender identity rules are clear
- required fields are validated
- common templates and variable insertion work
- bounce or provider rejection is visible when possible

### Common Bug Patterns

- sender/from restrictions not explained
- template variables fail silently
- provider rejection message hidden from user

## Meta Actions

### What To Verify

- supported actions are clearly listed
- credential selection works
- account/page/resource selection is correct
- action output is useful for downstream steps
- permission errors are specific enough to debug

### Common Bug Patterns

- selected resource does not match credential scope
- provider error too generic
- response shape differs between actions

## IF

### What To Verify

- condition builder is understandable
- true path and false path route correctly
- null or missing inputs behave predictably
- branch result is visible in execution logs

### Common Bug Patterns

- type coercion causes unexpected branch result
- empty string and null handled inconsistently
- branch explanation missing in logs

## Delay

### What To Verify

- delay is stored and resumed correctly
- delayed execution survives process restart
- resumed path continues only once
- execution logs clearly show queued and resumed state

### Common Bug Patterns

- duplicate resume
- lost delayed execution
- unclear status while waiting

## Merge

### What To Verify

- merge waits for intended active paths only
- downstream execution happens once
- logs show why merge continued
- current limitation is documented if semantics are partial

### Common Bug Patterns

- duplicate downstream execution
- merge continues too early
- merge waits forever for path that should not be required

## Switch

### What To Verify

- match logic is understandable
- only intended branch executes
- default branch behavior is clear
- value comparison rules are documented

### Common Bug Patterns

- case matching behaves unexpectedly
- type mismatch causes silent fall-through
- default branch not explained in execution logs

## Node Audit Tracker

Use this table to track progress across all nodes.

| Node | Category | Status | Deep Dive Done | Bugs Logged | Improvement Tasks Created | Beta Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Manual Trigger | Trigger | Not Started | No | No | No | Pending |
| Webhook | Trigger | Not Started | No | No | No | Pending |
| Schedule Trigger | Trigger | Not Started | No | No | No | Pending |
| Facebook Lead Ads | Trigger | Not Started | No | No | No | Pending |
| Google Form | Trigger | Not Started | No | No | No | Pending |
| HTTP Request | Action | Not Started | No | No | No | Pending |
| Google Sheets | Action | Not Started | No | No | No | Pending |
| Gmail | Action | Not Started | No | No | No | Pending |
| Send Email | Action | Not Started | No | No | No | Pending |
| Slack | Action | Not Started | No | No | No | Pending |
| Discord | Action | Not Started | No | No | No | Pending |
| Telegram | Action | Not Started | No | No | No | Pending |
| WhatsApp | Action | Not Started | No | No | No | Pending |
| Facebook Page | Action | Not Started | No | No | No | Pending |
| Instagram | Action | Not Started | No | No | No | Pending |
| Meta Actions | Action | Not Started | No | No | No | Pending |
| `IF` | Control Flow | Not Started | No | No | No | Pending |
| `Delay` | Control Flow | Not Started | No | No | No | Pending |
| `Merge` | Control Flow | Not Started | No | No | No | Pending |
| `Switch` | Control Flow | Not Started | No | No | No | Pending |

## Expected Outcome

When this checklist is complete, the team should know:

- which nodes are truly ready for beta
- which nodes are only usable with limitations
- which bugs are blocking launch confidence
- which nodes need UX improvement first
- which connectors should be removed from beta scope
- where engineering effort should go next
