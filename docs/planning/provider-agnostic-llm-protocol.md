# Provider-agnostic LLM protocol

Status: parallel feature branch from PR #37 head `97b2e474d4c609002a4c786f81c60446e3b0be5e`.

## Objective

Add the release-critical communication layer between AAAAT and external LLM providers without coupling provider SDKs to storage, UI composition, or agent mutation authority.

## Architecture

```text
AAAAT bounded task/context
→ LlmTaskRequest
→ LlmConversationEngine
→ LlmProvider adapter
→ provider API or local model
→ LlmTaskResponse
→ protocol validation
→ existing AAAAT review/apply flow
```

The protocol is provider-neutral. Adapters translate requests and responses only.

## Current slice

- versioned `LlmTaskRequest` and `LlmTaskResponse`;
- conversion from the existing bounded agent task context;
- recursive rejection of internal entity identifiers;
- required structured-result validation;
- provider capability contract;
- provider-neutral conversation engine;
- fake-provider behavioral tests.

## Non-goals for this slice

- provider SDK dependency;
- direct database writes from an adapter or model;
- autonomous multi-agent planning;
- browser UI;
- prompt marketplace or plugin system;
- provider-specific business logic;
- conversation persistence before the execution protocol is accepted.

## Next vertical slice

1. Add a local OpenAI-compatible HTTP adapter using the standard library or an already accepted lightweight HTTP dependency.
2. Add provider configuration through environment/config values without storing secrets in the database.
3. Execute one existing queued AAAAT task through the engine.
4. Submit the validated response through the existing task-result path.
5. Surface the pending proposal in the desktop UI for human review.
6. Apply only through the existing AAAAT task binding.

Recommended first task type: `company_research` or recruiter-call preparation derived from the current Smart View fields.

## Independence from PR #38

This branch depends on existing PR #37 contracts:

- opaque task handles;
- bounded agent contexts;
- response formats;
- internal review/apply flow;
- no broad entity-ID mutation authority.

It does not depend on PR #38 field-policy extraction, active-view projection changes, or desktop adapter hardening. Later integration may reuse PR #38 application commands, but the protocol must remain independent of them.
