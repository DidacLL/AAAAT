# Runtime Boundary Notes for Dashboard UX Work

## Principle

Dashboard UX work applies to the human-local dashboard runtime only.

It must not redefine the agent runtime.

## Dashboard runtime

The dashboard runtime is allowed to:

- Render server-side HTML.
- Render private human-local data.
- Expose dashboard form actions.
- Use internal IDs in HTML where needed for human-local interaction.
- Serve static dashboard assets.
- Provide full local mode, read-only mode, and static demo mode.

Dashboard HTML may contain private IDs because it is not an agent contract.

## Agent runtime

The agent runtime must remain separate.

The agent runtime must not expose:

```text
Dashboard HTML
Dashboard static assets
Dashboard fragments
Dashboard form actions
Broad candidature list/search/profile CRUD
Entity-ID mutation authority
```

The agent runtime should expose only capability-scoped operations such as:

```text
Get next pending task
Get bounded task context by task handle
Submit JSON result for task handle
Get bounded context bundle
Submit bounded action packet
Create a new candidature from source material/user conversation where allowed
Request bounded future tasks
```

Task handles are not general entity IDs. They are allowed only for task context/result flow.


## Dashboard projection boundary

The dashboard runtime may use an internal projection/view-model layer to prepare structured state for HTML rendering. This layer is part of the dashboard adapter and domain-facing UI model, not part of the agent runtime.

The projection layer may contain human-local data needed by the dashboard, including selected candidature details, primary note state, artifact summaries, task queue summaries, profile/career summaries, and table column state. Because this projection is intended for the human-local dashboard, it must not be exposed wholesale to agents.

Future embedded UI adapters may consume similar projection data, but that is a separate adapter decision. The dashboard branch should not turn projection data into a broad HTTP or agent contract by default.

## Why this matters for UX work

The dashboard redesign introduces richer human UI:

- Four dashboard views.
- Inline editing.
- Smart View context modules.
- Detailed View table/grid.
- Detailed View toolbox.
- Detailed View LLM task queue.

None of that should become part of the agent-facing contract.

The human dashboard can have controls that the agent runtime does not have.

## Safe dashboard-specific behavior

The dashboard may support:

```text
Selecting candidature rows
Editing visible fields inline
Editing the primary note
Opening raw intake panels
Opening profile/configuration panels
Triggering dashboard form actions
Showing task queue summaries
Showing artifact paths or internal references where appropriate for the human-local UI
```

These are dashboard capabilities, not agent capabilities.

## Unsafe agent-facing leakage

Do not add agent-facing routes or outputs that provide:

```text
application_id as mutation authority
candidature_id as mutation authority
profile_fact_id as mutation authority
artifact_id as mutation authority
task IDs beyond bounded task handles
full dashboard payloads
full dashboard projection dumps
full table/grid exports
raw unrestricted profile dumps
raw unrestricted candidature dumps
```

## Testing implication

Dashboard tests should verify human UI behavior.

Agent security tests should verify the agent app does not mount dashboard routes/actions and does not expose broad mutation authority.

Do not write brittle tests that pretend the dashboard runtime itself is the agent boundary.

## Documentation implication

Documentation should clearly say:

- Dashboard runtime is for the human user.
- Agent runtime is for bounded machine-facing operations.
- Dashboard form actions are not API guarantees for agents.
- The task queue shown in the dashboard is human-facing state, not broad task enumeration authority for agents.
