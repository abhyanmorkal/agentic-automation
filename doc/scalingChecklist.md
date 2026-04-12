# Scaling Checklist

## Goal

This document tracks the work needed to move the workflow engine from closed
beta readiness to a stronger multi-client, production-capable runtime.

The focus here is not feature breadth. The focus is:

- lower execution latency
- higher concurrent throughput
- safer retry behavior
- better tenant isolation
- clearer operational visibility

## Current Reality

The current architecture is good enough for:

- low-volume production usage
- internal testing
- founder-led demos
- small closed beta

The current architecture is not yet ready for:

- thousands of concurrent workflow executions
- noisy multi-tenant traffic
- strong provider-aware rate limiting at scale
- high-throughput branch-heavy workloads

## Success Criteria

We should consider this checklist meaningfully complete when:

- webhook-triggered workflows acknowledge quickly and execute asynchronously
- average workflow overhead is reduced noticeably
- node execution timing is visible
- provider-specific concurrency limits are in place
- retry and idempotency behavior is defined
- 100+ queued executions can be processed reliably in test conditions

## Workstream 1: Runtime Efficiency

- [ ] Reduce unnecessary `step.run()` calls in [functions.ts](/D:/node%20base/nodebase-main/src/inngest/functions.ts)
- [ ] Load workflow, user, and credential context once per execution
- [ ] Avoid repeated workflow and user lookups during a single run
- [ ] Snapshot workflow execution inputs at the beginning of the run
- [ ] Reduce serialization/deserialization overhead for execution context
- [ ] Review branch scheduler behavior for avoidable sequential bottlenecks

## Workstream 2: Execution Persistence

- [ ] Keep execution writes minimal but useful
- [ ] Store only essential node lifecycle writes by default
- [ ] Avoid redundant updates to the same execution row
- [ ] Review whether `ExecutionNode` writes can be reduced or batched safely
- [ ] Separate debug-detail logging from critical runtime persistence
- [ ] Add retention strategy for old execution logs

## Workstream 3: Concurrency And Throughput

- [ ] Define max concurrent executions per environment
- [ ] Define max concurrent executions per workflow
- [ ] Add provider-specific concurrency limits
- [ ] Add per-tenant throttling strategy
- [ ] Prevent one noisy tenant from monopolizing workers
- [ ] Plan safe parallel execution for independent branches

## Workstream 4: Queueing And Reliability

- [ ] Ensure inbound webhooks return fast and do not block on downstream work
- [ ] Make node execution idempotent where possible
- [ ] Define retry behavior per node category
- [ ] Add exponential backoff for transient provider failures
- [ ] Add dead-letter handling for repeatedly failing executions
- [ ] Document replay behavior for failed executions

## Workstream 5: Provider Rate Limits

- [ ] Add Google API throttling strategy
- [ ] Add Meta API throttling strategy
- [ ] Add LLM-provider retry and backoff rules
- [ ] Track quota and permission failures separately from generic errors
- [ ] Standardize provider error classification
- [ ] Add protections against bursty append/send/post actions

## Workstream 6: Observability

- [ ] Show total workflow duration vs node duration
- [ ] Show queue time vs actual work time
- [ ] Show slowest node in each execution
- [ ] Add alerts for slow workflows
- [ ] Add alerts for repeated provider failures
- [ ] Build a small operator dashboard for failed and slow runs

## Workstream 7: Architecture Hardening

- [ ] Separate ingestion concerns from worker concerns more clearly
- [ ] Prepare worker scaling plan for production
- [ ] Add execution version snapshot model
- [ ] Define tenant isolation model for runtime traffic
- [ ] Review current trigger delivery path for scaling choke points
- [ ] Plan branch parallelism without breaking deterministic execution logs

## Workstream 8: Testing And Benchmarks

- [ ] Benchmark a simple trigger -> action workflow
- [ ] Benchmark a branch workflow with `IF` and `Merge`
- [ ] Benchmark 10 concurrent executions
- [ ] Benchmark 100 queued executions
- [ ] Record DB query count for one execution
- [ ] Record external API call count per node type

## Priority Order

1. Reduce unnecessary runtime DB reads/writes
2. Add timing visibility per node and per run
3. Add provider concurrency limits
4. Make webhook ingestion fast and execution async-safe
5. Add retry/backoff/idempotency rules
6. Benchmark under load and remove biggest bottlenecks

## Immediate Next Steps

- [ ] Add timing metrics to [functions.ts](/D:/node%20base/nodebase-main/src/inngest/functions.ts)
- [ ] Measure actual time spent in:
  - execution creation
  - workflow preparation
  - node start write
  - node executor
  - node finish write
- [ ] Identify the top three slowest steps in a normal webhook -> Google Sheets run
- [ ] Reduce the highest-cost step first before adding more complexity
