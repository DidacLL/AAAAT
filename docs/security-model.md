# Security model

AAAAT is a single-user local desktop application. The wx desktop is the canonical human workspace and owns ordinary reading, editing, rendering, connection consent, and optional material review.

## Separated authority

The normal product keeps three concerns separate:

- the AAAAT application package;
- the user-selected private workspace;
- host-owned connection configuration or portable files created only when the user chooses assisted use.

The private workspace is not placed inside the application, repository, or AI-host configuration. The paired host receives no workspace or database path. AAAAT does not install a provider plugin, choose a provider, store provider credentials, or manage the host's configuration.

## Paired-host authority

The normal connected LLM receives a provider-neutral connection request and only the tools advertised by the paired bridge. The existing connection-status tool also returns the neutral AAAAT assistant contract, so a later host session can recover the product role without inspecting application files.

Named operations may:

- read plain connection state and the neutral assistant contract;
- open the desktop without receiving its private path;
- start bounded conversational profile work;
- create a new candidature from user-provided material and supported lifecycle requests;
- claim one ready complete work item;
- report progress for that active attempt;
- submit one validated result.

The bridge has no broad CRUD, record listing, arbitrary search, filesystem, database, desktop-command, maintenance, or identifier-based mutation surface. A generic local/admin CLI is not the agent contract.

## Work capabilities

Acquisition atomically claims one ready attempt and returns its complete purpose-scoped work item. The latest explicit desktop assistance request is selected before background work. A random attempt capability authorizes only the callbacks declared for that attempt. AAAAT privately binds it to internal records.

A capability is not an application, candidature, task-row, profile, career-plan, keyword, artifact, note, file, database, or storage identifier. Blocked, failed, completed, cancelled, revoked, stale, or superseded attempts cannot submit results.

Portable export claims queued work before transfer and never exports blocked or failed work. Advanced commands also run queued work only. Every accepted result passes the same canonical ingestion and lifecycle-release service.

## Result application

All wrappers use the same validation and domain-application services. External result fields cannot choose local record identifiers, storage paths, artifact paths, replacement policy, or task ordering. Task-specific schemas restrict top-level fields, nested candidature fields, and value types.

Existing non-empty profile values and established canonical keyword definitions remain authoritative. Explicit desktop refresh actions are user-owned authority; ordinary agent results fill eligible gaps or remain reviewable history. Generated material remains a draft until the user deliberately changes its state. Review is available but is not mandatory for every operation.

## Host adaptability

The external LLM owns provider/model selection, credentials, reasoning, network policy, research tools, and host-specific setup. With user approval, it may create its own MCP configuration, tool, skill, script, automation, or schedule. AAAAT supplies the narrow protocol and local validation; it does not predict every host or duplicate host permission systems.

## Data exposure

Work construction includes only purpose-required candidature state, source material, and profile representations. Profile variables and facts follow configured exposure rules: raw, summarized, anonymized, redacted, placeholder, or denied. Profile-completion work receives missing and protected field names, not the raw contents of protected values.

No real user data belongs in source control, fixtures, connection guidance, or release artifacts. Generated artifacts remain local and under desktop control.

## Operating-system limit

AAAAT's capability model is an application and information boundary, not an operating-system sandbox. A same-user process independently granted unrestricted shell, filesystem, database, or code-modification access can bypass it. Normal safe use grants the LLM host only the paired bridge or explicit portable files, not the repository, maintenance shell, application internals, or private workspace.
