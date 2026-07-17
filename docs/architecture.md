# Architecture

This document maps the implemented AAAAT system. The product definition in `product.md` explains why the system exists and which behavior is authoritative.

## System shape

```text
Human user
    ↕
wx desktop adapter
    ↕
application services
    ↕
SQLite workspace + local artifacts

Optional external LLM host
    ↕ bounded stdio/MCP or portable exchange
paired AAAAT bridge
    ↕
application services
```

The desktop and the optional bridge are two entry points into the same local application behavior. The bridge is not a second product and does not expose the desktop command surface.

## Runtime entry points

- `aaaat-desktop` starts the wx application.
- `aaaat-host-bridge` starts the bounded external-host bridge for an opaque connection capability.

Normal users do not need the repository CLI. CLI modules remain useful for development, automation, recovery, and deterministic testing, but they are not the primary product interface granted to an LLM host.

## Desktop adapter

`aaaat/ui_desktop/` owns wx widgets, layout, event handling, and presentation state.

The desktop delegates writes to application services rather than writing SQL from widgets. The main frame owns only top-level window behavior, view switching, menus, toolbars, and layout composition. View modules own their own rendering and interaction details.

The four primary views are Welcome, User, Smart, and Detailed. Smart View and Detailed View project the same candidature data for different operational purposes.

## Application services

Application services coordinate product use cases such as:

- selecting or initializing a workspace;
- creating and editing candidatures;
- retaining raw offer and form material;
- maintaining profile context;
- queuing optional assistance work;
- applying bounded results;
- rendering documents;
- managing artifacts;
- backup and restore.

A service may combine repository operations, but it must not make a valid candidature dependent on optional task creation or external runtime availability.

## Persistence

AAAAT uses one SQLite database in the private workspace. The schema is initialized from `aaaat/schema.sql`.

The main persisted concepts are:

- applications and candidature details;
- raw intake;
- glossary terms and keywords;
- profile variables and reusable profile facts;
- career plans;
- tasks used for deferred or external work;
- generated text and artifacts;
- notes and todos;
- templates and artifact events.

The schema is intentionally concrete. It is not hidden behind a generic entity framework.

### Candidature creation boundary

Creating a candidature stores the record and available source material immediately. Optional extraction, research, or document tasks are separate follow-up operations.

Unknown company, role, location, URL, or other values are stored as empty values. Placeholder facts are not inserted to satisfy the schema.

### Profile variable store

The `variables` table is the single authoritative store for profile variable values and exposure metadata. Profile helper functions are projections over that table. There is no compatibility mirror or migration path for an unreleased alternate profile table.

### Transactions

Transactions protect local consistency at narrow use-case boundaries. They do not include calls to an external LLM and do not turn optional task creation into a prerequisite for saving the user’s data.

## Templates and artifacts

Templates are stored in SQLite and use variable references. Rendering resolves profile and candidature values locally, writes output only under the private artifact area, and records the result in `generated_artifacts`.

Artifact states organize versions and external usage. They do not impose a mandatory approval pipeline.

## Optional external-host bridge

The bridge resolves an opaque connection capability to one private workspace internally. The host never receives that workspace path.

The bridge exposes a deliberately small catalogue. Typical operations are:

- connection status;
- open the desktop;
- begin profile work;
- create a candidature from supplied material;
- claim one bounded task;
- optionally report lightweight progress;
- submit one structured result.

The bridge does not expose arbitrary application listing, generic SQL, general CLI execution, filesystem browsing, internal identifiers as mutation authority, or desktop widget commands.

## Task mechanism

Tasks are deferred pieces of work attached to a candidature or profile purpose. They are not a generic workflow engine.

The essential path is:

```text
queued → claimed → completed | failed | cancelled
```

Some candidature lifecycle work may remain blocked until a direct prerequisite exists. This is local product logic, not an external-agent orchestration framework.

Task acquisition uses one atomic compare-and-set so two consumers cannot claim the same queued task. A random capability identifies the callback for that task. Results are accepted only while the task is active and are applied internally to the bound record.

The implementation does not require leases, distributed coordination, autonomous recovery agents, or a general transition framework.

## Result validation

AAAAT validates that a result:

- is one JSON object;
- stays within a practical size and nesting bound;
- matches the result shape declared by the task;
- does not contain forbidden authority fields;
- targets an active task capability.

After validation, AAAAT applies the result directly. There is no generic suggestion-approval queue between accepted work and the local record.

## Privacy boundary

The lower-level boundary is structural:

- the bridge resolves workspace details internally;
- contexts are purpose-scoped before they leave the application;
- profile variables obey exposure rules;
- capabilities are opaque and task-scoped;
- storage paths and entity IDs are removed from external contracts;
- result schemas restrict accepted writes;
- artifact paths are chosen and confined locally.

Instructions reinforce this boundary but are not relied on as the enforcement mechanism.

## Packaging

PyInstaller produces a native desktop executable and a sibling bridge executable from the same source tree. The package includes:

- the desktop application;
- the bounded bridge;
- `aaaat/schema.sql`;
- `aaaat/SKILL.md`, whose skill name is `AAAAT`;
- concise user launch material.

Repository-development instructions, tests, build tools, planning files, and private data are excluded from installed releases.

## Dependency policy

Core runtime dependencies remain empty. wxPython is the desktop dependency. PyInstaller is a release-build dependency. New frameworks require a concrete reduction in product complexity and must not replace direct Python and SQLite code with a generic architecture.
