# Annex F — Non-Goals and Risk Limits

## Non-goals for this run
Do not:

- rewrite the dashboard;
- replace the web UI with a native executable;
- remove dashboard/local routes needed by the current human UI;
- introduce auth/session/OAuth frameworks;
- introduce Electron, Tauri, React, Vue, Svelte, Streamlit, Reflex, Flet, or npm build steps;
- introduce provider SDKs or model configuration;
- introduce cloud services;
- introduce ORM/Alembic or a database server;
- introduce Celery/Redis/background workers;
- implement a real MCP server if only the descriptor currently exists;
- destructively rename database tables;
- auto-overwrite approved user fields from agent output.

## Risk limits to document
AAAAT cannot fully protect private data if an agent has:

- direct filesystem access to `.private/`;
- shell access sufficient to inspect DB/files or start arbitrary commands;
- arbitrary localhost/network access while the human dashboard server is running;
- the ability to modify the codebase before interacting with the private store.

For production-ready-asap, the app should still reduce expected accidental/over-capable agent behavior by exposing a narrow task protocol and avoiding broad agent-facing CRUD contracts.

## Mature product stance
Do not change UI technology for privacy theater. The current web dashboard remains acceptable as the human local UI. The privacy improvement is to narrow the agent protocol and adapters, not to rebuild the dashboard.
