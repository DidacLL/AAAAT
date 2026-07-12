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

## Implemented slice

- versioned `LlmTaskRequest` and `LlmTaskResponse`;
- conversion from the existing bounded agent task context;
- recursive rejection of internal entity identifiers;
- required structured-result validation;
- provider capability contract;
- provider-neutral conversation engine;
- OpenAI-compatible chat-completions adapter implemented with the Python standard library;
- environment/CLI configuration without database secret persistence;
- `aaaat-llm` executable entry point;
- end-to-end execution of an existing task handle;
- validated result submission through the existing suggested-review task result flow;
- fake-provider and local HTTP-server behavioral tests.

## Configuration

Required values can be supplied through environment variables:

```text
AAAAT_LLM_PROVIDER=openai-compatible
AAAAT_LLM_MODEL=<provider model name>
AAAAT_LLM_BASE_URL=<provider root URL before /v1/chat/completions>
AAAAT_LLM_API_KEY=<optional bearer token>
AAAAT_LLM_TIMEOUT_SECONDS=60
```

Secrets remain process configuration. The runtime does not write API keys to AAAAT storage, task results, or model prompts.

Equivalent command-line overrides are available through `aaaat-llm`.

## Execute a queued task

First obtain a bounded task handle using the existing agent interface:

```bash
aaaat --storage .private agent next
```

Then execute that task through the configured provider:

```bash
AAAAT_LLM_MODEL=my-model \
AAAAT_LLM_BASE_URL=http://127.0.0.1:11434 \
aaaat-llm --storage .private run taskh_...
```

The command:

1. rebuilds the bounded context from the opaque task handle;
2. sends only the protocol request to the provider;
3. validates the returned JSON object;
4. stores it as a suggested task result;
5. leaves application of the result to AAAAT's existing review/apply path.

It does not mutate the candidature directly.

## Validation status

The first complete adapter/runtime slice passed the repository Agent Contract Tests and full unittest discovery before the final CLI-configuration test addition. The branch remains draft until the latest head is green.

Behavioral coverage includes:

- request and response protocol validation;
- internal-ID rejection in nested structures;
- task-handle correlation;
- required result-field enforcement;
- provider capability enforcement;
- real local HTTP transport and JSON parsing;
- bearer-token header handling without prompt leakage;
- environment and CLI configuration precedence;
- task-result persistence as `suggested`;
- provider/model provenance on the stored result.

## Current non-goals

- autonomous multi-agent planning;
- direct database writes from an adapter or model;
- browser UI;
- prompt marketplace or plugin system;
- provider-specific business logic;
- persistent conversation threads before task execution and review are accepted;
- automatic application of LLM output.

## Next vertical slice

1. Add desktop controls to execute an eligible queued task.
2. Surface provider status, validation errors, and usage metadata.
3. Show the suggested result in the existing review area.
4. Allow explicit human apply/reject actions through existing task bindings.
5. Add a second adapter only after the first end-to-end UX is accepted.

Recommended first release task type: `company_research`, followed by recruiter-call preparation derived from the current Smart View fields.

## Independence from PR #38

This branch depends on existing PR #37 contracts:

- opaque task handles;
- bounded agent contexts;
- response formats;
- internal review/apply flow;
- no broad entity-ID mutation authority.

It does not depend on PR #38 field-policy extraction, active-view projection changes, or desktop adapter hardening. Later integration may reuse PR #38 application commands, but the protocol remains independent of them.
