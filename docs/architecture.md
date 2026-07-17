# Architecture

This document maps the implemented AAAAT system. The product definition in `product.md` is authoritative for product behavior and principles.

## System shape

```text
Human user
    ↕
wx desktop adapter
    ↕
explicit application services
    ↕
private SQLite workspace + local artifacts

Optional external LLM host
    ↕ bounded stdio/MCP or portable files
paired AAAAT bridge
    ↕
explicit application services
```

The desktop and optional bridge are entry points into the same product domain. The bridge is not a second product and does not expose the desktop command surface.

## Runtime entry points

- `aaaat-desktop` starts the wx application.
- `aaaat-host-bridge` starts the paired bounded bridge for an opaque connection capability.

The repository CLI supports maintenance, deterministic testing, backup, and advanced local operation. It is not the authority granted to a connected LLM.

## Desktop adapter

`aaaat/ui_desktop/` owns wx widgets, layout, event handling, and presentation state. Widgets delegate writes to desktop services rather than writing SQL directly.

The four primary views are:

- Welcome — workspace orientation and direct entry into useful work;
- User — reusable professional context and preferences;
- Smart — compact recruiter-call and urgent-preparation context;
- Detailed — complete candidature inspection, editing, and material management.

Smart and Detailed View project the same candidature domain for different operational needs.

## Application services

Services coordinate concrete use cases:

- initialize or select a workspace;
- create and edit candidatures;
- retain raw offer and form material;
- maintain profile variables and facts;
- create explicit assistance tasks;
- apply bounded results;
- render documents and manage artifacts;
- back up and restore the workspace.

There is no generic entity framework, connector manager, plugin system, or workflow engine.

## Persistence

AAAAT uses one SQLite database initialized from `aaaat/schema.sql`. The main persisted concepts are applications, candidature details, raw intake, keywords, profile variables and facts, career plans, explicit tasks, generated text, artifacts, notes, todos, and templates.

### Candidature creation boundary

Creating a candidature stores the local record and available source material immediately. It does not automatically create AI work. Extraction, research, evaluation, preparation, or document work is requested separately by the desktop or connected host.

Company, role, location, URL, and other unknown values remain empty. AAAAT does not invent placeholder facts to satisfy the schema.

### Profile storage

The `variables` table is the authoritative store for profile variable values and exposure metadata. `profile_facts` stores reusable structured professional context. There is no compatibility mirror or migration path for an unreleased alternate profile store.

### Transactions

Transactions protect narrow local consistency boundaries. External AI calls and optional task creation are never prerequisites for saving a candidature.

## Templates and artifacts

Templates are stored in SQLite and use variable references. AAAAT resolves values locally, confines output to the private artifact area, and records provenance.

Artifact states are `draft`, `submitted`, and `archived`. They organize current work and external use; they are not approval gates.

## Connection request and paired bridge

**Connect my AI** creates a self-contained handoff containing the exact packaged `AAAAT` skill and an opaque connection card. The card contains:

- protocol version;
- revocable connection capability;
- exact stdio launch command and arguments;
- the paired tool schemas;
- portable exchange fallback guidance.

The host performs its standard MCP or equivalent initialization and tool discovery. AAAAT does not implement provider-specific setup logic or a connector certification protocol.

The paired catalogue contains six operations:

1. read plain connection status;
2. open or focus the desktop;
3. start one bounded profile task;
4. create a candidature from supplied material and outputs;
5. atomically claim one ready bounded task;
6. submit one structured result.

The bridge does not expose arbitrary application listing, generic SQL, general CLI execution, filesystem browsing, workspace paths, internal identifiers as mutation authority, or desktop widget commands.

## Task mechanism

Tasks are explicit deferred pieces of work, not an orchestration framework.

```text
queued → claimed → completed | failed | cancelled
```

A task may be `blocked` while a concrete local prerequisite is absent. When the prerequisite becomes available, AAAAT returns it to `queued`.

Acquisition is one atomic compare-and-set. A fresh random callback capability is created only for the claimed attempt. Completion, failure, cancellation, or release invalidates it. There are no leases, heartbeats, persisted progress streams, autonomous recovery agents, or generic transition engine.

A local user-owned command may emit transient status messages for the desktop while it runs. Those messages are not part of the external authority protocol and are not persisted.

## Result validation and application

AAAAT validates that a result:

- is one JSON object;
- stays within practical size, item, and nesting bounds;
- matches the task-specific result schema;
- contains no forbidden authority fields;
- uses the active capability for the claimed task.

AAAAT then applies the permitted result to the internally bound record and invalidates the capability. Conflicting or unsupported material may be retained as history, but there is no suggestion-approval queue.

## Privacy boundary

The lower-level boundary is structural:

- the bridge resolves workspace details internally;
- contexts are purpose-scoped before leaving AAAAT;
- profile values obey exposure rules;
- capabilities are opaque, attempt-scoped, and short-lived;
- storage paths and internal IDs are absent from external contracts;
- result schemas restrict accepted writes;
- artifact paths are selected and confined locally.

Instructions reinforce these rules but are not the enforcement mechanism.

## Packaging and dependencies

PyInstaller produces a native desktop application and sibling bridge from the same source. Packages include the application, bridge, schema, `aaaat/SKILL.md`, and concise user help. Repository instructions, tests, build tools, planning records, and private data are excluded.

Core runtime dependencies remain empty. wxPython is the desktop dependency and PyInstaller is used only for native builds. New frameworks require a concrete reduction in product complexity.
