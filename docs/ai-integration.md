# Optional AI integration

AAAAT is complete without an AI connection. This document describes the optional boundary used when an external LLM performs research, extraction, evaluation, or writing for the local workspace.

## Responsibility split

AAAAT owns:

- private local data;
- purpose-scoped context construction;
- validation;
- candidature and profile updates;
- templates and rendering;
- artifact paths and records;
- bridge authority.

The external host owns:

- model and provider selection;
- credentials;
- network access and research policy;
- reasoning and generated language;
- host-specific tool or MCP configuration.

AAAAT does not call a provider SDK or select a model internally.

## Packaged skill

The installed LLM-facing instruction is `aaaat/SKILL.md` and its skill name is `AAAAT`.

Repository files such as `AGENTS.md`, development documentation, tests, and build tooling are not part of the installed LLM contract and are excluded from releases.

## Pairing

When the user chooses to connect an external host, AAAAT creates an opaque connection capability and a self-contained connection request. The host uses the supplied bridge command without receiving a workspace path or database argument.

A connection capability selects one workspace internally. It can be revoked. It is not a general bearer token for filesystem or database access.

## Bounded work

The bridge may expose operations for direct bounded actions and queued work. A work item contains:

- its purpose;
- task-specific context;
- instructions;
- allowed operation;
- result schema;
- privacy notes;
- an opaque callback capability.

The host does not receive arbitrary record IDs to browse or mutate. AAAAT binds the task capability to the internal record and applies a valid result locally.

## Autonomous application

AAAAT does not create a mandatory human approval or review loop around AI work. Once a result satisfies the task contract, it is applied to the intended local data.

The user can edit the resulting record through the desktop like any other data. Artifact labels such as draft, submitted, or archived organize material and external usage; they are not mandatory AI-safety gates.

The LLM may ask for a material missing fact when necessary, but it should not block routine work on repeated confirmations. An offer can be retained and a candidature can exist before a profile is complete or an AI is available.

## Privacy enforcement

Privacy is enforced before data leaves AAAAT:

- profile values are resolved according to exposure rules;
- only purpose-relevant candidature context is included;
- workspace and artifact paths remain local;
- database and desktop command surfaces are unavailable;
- result payloads are bounded and schema-validated;
- forbidden authority fields are rejected.

The product does not depend on a person reading hidden reasoning or approving every generated field.

## Connection methods

The external host chooses the strongest method it supports:

1. the paired local bridge through MCP or equivalent stdio tools;
2. a host-owned durable tool or skill;
3. an approved host-side script or automation;
4. portable task/result exchange.

These are adapters to the same bounded contract. They do not change the product data model or give a provider a privileged integration.

## Manual independence

When no host is connected:

- candidatures continue to save and remain visible;
- queued work can remain queued indefinitely;
- the user can edit fields manually;
- existing text and profile values can still be rendered;
- backup, search, Smart View, and Detailed View continue to work.

A connection failure must not roll back local data or make the desktop unusable.
