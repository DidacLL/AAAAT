# AAAAT Repository Development

This file applies only when the user explicitly asks to build, inspect, test, review, or change the AAAAT software project.

AAAAT job-search use has a separate runtime interface. A host helping a person with their career must use the exported AAAAT host-integration material and paired bridge supplied by the installed desktop application. Repository files, developer documentation, tests, maintenance commands, source modules, and private workspace files are not the runtime interface.

## Product boundary

AAAAT is a local-first, provider-agnostic job-application workspace and artifact generator. The wx desktop application is the canonical human application and remains fully useful without an external LLM.

AAAAT owns private persistence, bounded work construction, validation, deterministic application of accepted results, rendering, provenance, artifacts, and desktop state.

An external LLM host owns reasoning, research tools, provider and model selection, credentials, network policy, and host-specific setup. With the user’s approval, that host may create its own MCP configuration, tool, skill, script, automation, or schedule. AAAAT supplies the narrow protocol and enforces local authority.

## Runtime isolation invariant

The normal connected host receives only:

- the exported runtime skill and connection material;
- the paired bridge tool catalogue;
- one complete purpose-scoped work item at a time;
- the callbacks declared for that work item.

The normal connected host does not receive the repository, the private workspace, general CLI/admin functionality, database access, arbitrary record browsing, internal identifiers, or desktop mutation commands.

This is enforced through installed artifacts, folder separation, bridge schemas, capabilities, and domain validation. Runtime safety must not depend primarily on instructions asking an LLM to avoid reachable commands.

## Development priorities

When changing AAAAT:

1. Preserve manual wx operation and accepted Smart/Detailed behavior.
2. Keep normal-user setup plain and guided.
3. Keep host-specific technical adaptation in the external LLM host.
4. Keep the agent-facing surface capability-scoped and structurally narrow.
5. Prefer small domain services and explicit schemas over generic frameworks.
6. Treat generated tests and documentation as non-authoritative when they conflict with maintainer intent or executable product behavior.

Do not introduce provider catalogues, provider SDKs, credential stores, host detectors, generic plugin frameworks, broad CRUD APIs, generalized workflow engines, or provider/OS-specific product architecture.
