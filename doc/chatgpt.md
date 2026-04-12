I checked the current codebase. We’ve made solid progress, and the remaining work is now much smaller and clearer.

Phase 1 remaining

Most of Phase 1 is done. OAuth hardening and webhook security are in place.

What still remains:

Workflow validation before save/run is still missing.
We still need a central validator for things like missing credentials, invalid trigger config, bad variable references, unreachable nodes, and invalid node setup.
Structured error taxonomy is still missing.
Right now errors are handled, but we don’t yet have a clean shared model like validation, configuration, credential, provider, and retryable errors.
So Phase 1 is functionally secure now, but not fully “platform-safe” until validation and error classification are added.

Phase 2 remaining

A lot of Phase 2 is already done:

trigger-aware execution
reachable-subgraph execution
per-node execution records
node-output references
first variable picker UX
What still remains:

Extend the reference picker to more nodes, not just AI nodes.
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
Improve the picker from “insert node output reference” to “pick exact fields from output”.
Right now it’s useful, but still not schema-aware enough.
Add first real control-flow nodes:
IF
Switch
Merge
Delay
Loop
Move further away from implicit shared context into clearer per-node input/output flow semantics.
Add stronger runtime replay/debugging for branching workflows once control nodes exist.
So Phase 2 is partially complete, but the engine still needs real flow-control behavior to feel n8n-like.

Phase 3 remaining

I verified that the main connector-framework pieces are now present:

connector definitions exist
connector registry exists
Google definition exists
Meta definition exists
Meta auth helper exists
Meta executors use shared auth helper
credentials UI uses connector registry metadata
That means the foundation of Phase 3 is done.

What still remains:

The connector registry is still mostly metadata-level, not a full runtime contract yet.
We still need richer connector definitions for:
actions
triggers
config schema
output schema
test connection
error mapping
refresh/token lifecycle policy
Runtime execution is still executor-driven, not fully connector-definition-driven.
Some provider-specific UI and trigger logic are still hardcoded instead of being generated from connector definitions.
Facebook lead trigger server-side integration may still need one more pass to fully align with the shared Meta layer.
So Phase 3 is not “unfinished from scratch”; it’s more accurate to say:

Phase 3 foundation is done
Phase 3 advanced connector standardization still remains
Short status

Phase 1: almost done
Phase 2: mid-to-late stage
Phase 3: foundation done, deeper standardization remains
Best next step

The highest-value next move is:

Finish Phase 1 with workflow validation + error taxonomy, or
Finish Phase 2 by adding IF and Delay first, because that unlocks real automation behavior fast.
If you want, I can take the next step and start with the workflow validation system first.