# Security Model

AAAAT v1 is a single-user local desktop application. The canonical human runtime is:

```bash
aaaat-desktop
```

Private data lives under `.private/` by default or another explicit local path.

## Trust boundary

The desktop may display and edit rich local state because it is the user's local interface. External AI hosts use bounded adapters over one AAAAT-owned queue. These adapters are not broad CRUD APIs and are not independent application runtimes.

## Work acquisition

`aaaat agent next` atomically claims one eligible queued task and returns its complete purpose-scoped work item. The returned `task_capability` is random, persisted, and scoped to that attempt.

The capability authorizes only task progress and result submission. It is not derived from an internal task ID and is not authority over applications, candidatures, profile facts, career plans, artifacts, notes, todos, blobs, files, or storage.

There is no separate context endpoint or packet-generation step. Removing that split reduces confused-deputy behavior, stale-context reuse, and duplicate acquisition.

## Result and action ingestion

All transport wrappers call the same result-ingestion and bounded-action services. AAAAT validates structure, rejects forbidden authority fields, applies changes through deterministic domain logic, and returns narrow acknowledgements.

Agent-facing payloads must not expose or accept internal entity IDs, storage paths, arbitrary file paths, SQLite access, broad collections, profile dumps, or generic search/mutation authority.

The supported bounded action may create a new candidature from supplied source material and outputs. AAAAT creates related records and follow-up tasks internally; acknowledgements omit internal IDs and paths.

## Adapter policy

CLI, stdio MCP, browser native messaging, portable files, and user-owned commands are thin mappings over the same services. They must not create another queue, state machine, persistence layer, or mutation path.

AAAAT does not own provider credentials, model selection, inference, browser automation, or external network policy. Optional runtime/model labels are provenance only.

## Data exposure

Profile variables and facts follow configured exposure rules: raw, summarized, redacted, placeholder, or denied. Career plans and candidature material are included only when relevant to a bounded task or action.

Templates and public examples must not contain real user data. Generated artifacts remain local and require human review before external use.

## Limit

AAAAT cannot constrain an external process that already has unrestricted filesystem, shell, database, or code-modification access. The capability protocol limits exposure and authority through supported integrations; operating-system permissions remain the outer security boundary.
