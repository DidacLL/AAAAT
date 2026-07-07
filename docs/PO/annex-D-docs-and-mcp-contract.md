# Annex D — Docs and MCP Contract Updates

Update these files:

```text
AGENTS.md
docs/agent-guide.md
docs/security-model.md
docs/openapi.md
docs/cli.md
aaaat/mcp_server.py
```

## Required content change

Agent-facing docs must present a capability-scoped agent contract. The task protocol is the implemented capability. Raw-offer intake and structured extraction/proposal submission are valid future capabilities when they are schema-bound and non-CRUD.

Recommended wording:

> Agents interact with AAAAT through capability-scoped operations with explicit input/output schemas. Agents must not browse, list, search, or patch the user's candidature database.

## Remove from agent-facing contract

Do not advertise these as agent endpoints/resources/tools:

```text
GET /api/dashboard-payload
GET /api/review-queue
GET /api/applications
GET /api/applications/{id}
GET /api/applications/{id}/context
PATCH /api/applications/{id}
GET /api/candidatures
GET /api/candidatures/{id}
GET /api/candidatures/{id}/context
PATCH /api/candidatures/{id}
GET /api/search
GET /api/variables
GET /api/variables/{key}
PUT /api/variables/{key}
GET /api/profile/facts
GET /api/profile/context
POST /api/render/cv
POST /api/render/cover-letter
```

These can remain dashboard/local human routes, but not agent contracts.

## MCP descriptor

Replace broad resources/tools with capability-scoped descriptors.

Implemented resources:

```text
aaaat://agent/tasks
aaaat://agent/tasks/{task_id}/context
aaaat://agent-guide
```

Implemented tools:

```text
list_agent_tasks
get_agent_task_context
submit_agent_task_result
claim_agent_task
release_agent_task
```

Allowed future resources/tools:

```text
aaaat://agent/capabilities
create_agent_raw_offer_intake
submit_agent_structured_extraction
```

The future intake/extraction tools must return narrow acknowledgements, opaque correlation ids, and/or task envelopes. They must not return all candidatures or expose generic CRUD.

Prompts may remain capability-oriented, but should produce task results or schema-bound proposals rather than call broad CRUD.

## Documentation must be honest

State clearly:

- docs do not enforce security;
- route absence and narrow service functions enforce the agent surface;
- if an agent has `.private/`, shell, or arbitrary localhost access, AAAAT cannot fully constrain it;
- aggregate candidature lists are private behavioral data.
