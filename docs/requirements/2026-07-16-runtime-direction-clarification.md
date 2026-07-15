# Authoritative clarification: runtime direction

Status: authoritative v1 clarification.

Date: 2026-07-16.

This clarification supplements `v1-authoritative-requirements.md` and records the maintainer's direct correction where prior wording could be read as AAAAT initiating LLM inference.

## Canonical direction

AAAAT is a passive, local-first workspace with a bounded task queue. The standard assisted architecture is:

```text
AAAAT creates bounded tasks
→ an external AI or agent host connects to AAAAT
→ the external actor obtains or receives one eligible task
→ AAAAT supplies purpose-scoped context through the existing bounded commands/services
→ the external actor performs reasoning in its own runtime
→ the external actor reports progress and submits a structured result or permitted action
→ AAAAT validates, applies, persists and renders locally
```

AAAAT does not, as part of its standard architecture:

- select, host, download or manage an LLM;
- choose a provider, model or inference runtime;
- call provider APIs or inference endpoints;
- launch model servers or provider CLIs;
- schedule or orchestrate LLM reasoning;
- duplicate the existing task queue inside a transport adapter.

MCP, CLI, files, portable bundles, browser bridges and generated connectors are thin communication wrappers around the existing bounded task/action/context commands and domain services. They do not implement a second queue or a separate mutation path.

## Standard connection priority

The primary automatic experience is an external AI host connecting to AAAAT and consuming the bounded task queue. Generated connector onboarding exists so the user's chosen AI can adapt to AAAAT without a provider catalogue in AAAAT core.

“Automatic” means that repeated manual transfer is avoided. It does not mean AAAAT owns or initiates inference.

## Advanced user-owned command option

AAAAT may retain an explicit Advanced integration in which a technical user configures a command, macro or script that receives one bounded task envelope and returns one bounded result envelope. That user-owned program may trigger an LLM or other external system.

This path is:

- optional and Advanced-only;
- explicitly configured by the user;
- owned and controlled by the user, not AAAAT;
- constrained to the same bounded task/result contract;
- not the standard onboarding path;
- not the core architecture;
- not evidence that AAAAT is an LLM wrapper or orchestrator.

The minimum advanced command contract remains:

```text
stdin  = one bounded task envelope
stdout = one final result envelope
stderr = optional progress and diagnostics
```

## Interpretation rule

Any code, test, UI wording, requirement or release claim that treats AAAAT-initiated LLM execution, a named runtime, a provider endpoint, or a model-host health probe as the normal product architecture is stale and must be corrected.

The task queue and canonical result-ingestion/domain-application services remain the single source of truth. Transport wrappers must reuse them rather than reproduce them.
