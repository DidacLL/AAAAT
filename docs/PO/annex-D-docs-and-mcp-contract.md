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

Agent-facing docs must present a capability-scoped agent contract. The task protocol is the implemented capability. The next future capability should be an action-session protocol, not CRUD and not raw-offer upload.

Recommended wording:

> Agents interact with AAAAT through capability-scoped operations with explicit input/output schemas. Agents may request purpose-scoped context, then submit one bounded action. Agents must not browse, list, search, or patch the user's candidature database.

## Required actor split

Docs must distinguish two directions:

```text
AAAAT-originated work: AAAAT creates task -> agent returns task result -> AAAAT applies deterministically.
LLM-app-originated work: LLM already did the reasoning -> AAAAT receives bounded action data -> AAAAT stores/renders locally.
```

Docs must state that the LLM is not the user and does not create final artifacts. AAAAT renders CVs and cover letters locally from templates, profile/application data, and explicit render inputs.

## Remove from agent-facing contract

Do not advertise broad object-style routes/resources/tools as agent capabilities. Dashboard/local human commands may still exist, but they are not the agent contract.

Avoid future docs that frame agent integration as:

```text
agent raw-offer upload
structured extraction proposal endpoint
generic candidature create/update/list/show
LLM-generated final artifact file submission
agent-written human notes
```

## MCP descriptor

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

Allowed future tools:

```text
get_agent_context_bundle
submit_agent_action
```

The future action tools must return narrow acknowledgements and should not require the LLM contract to depend on internal AAAAT object identifiers.

Prompts may remain capability-oriented, but should produce task results or bounded action payloads rather than call broad CRUD.

## Documentation must be honest

State clearly:

- docs do not enforce security;
- route absence and narrow service functions enforce the agent surface;
- if an agent has `.private/`, shell, or arbitrary localhost access, AAAAT cannot fully constrain it;
- aggregate candidature lists are private behavioral data.
