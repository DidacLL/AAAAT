# AAAAT Agent Instructions

AAAAT is not an LLM wrapper, provider SDK, agent orchestrator, or CRUD API for agents. Agents use capability-scoped commands with explicit input/output shapes. Do not browse, list, search, or patch the user's candidature database.

Implemented agent task capability:

- `python -m aaaat.cli agent next`
- `python -m aaaat.cli agent context <task_handle>`
- `python -m aaaat.cli agent packet <task_handle>`
- `python -m aaaat.cli agent submit <task_handle> --result-body "..."`
- `python -m aaaat.cli agent submit <task_handle> --result-file result.json`

Implemented action-session capability:

- `python -m aaaat.cli agent context-bundle --purpose <purpose>`
- `python -m aaaat.cli agent action submit --input-file action.json`
- `python -m aaaat.cli agent action submit --input-body '{"action":"create_candidature","payload":{...}}'`

A task handle is an opaque callback handle for one bounded task. It is not a task row ID, application ID, candidature ID, profile fact ID, artifact ID, file path, or storage path, and it must not be treated as mutation authority over arbitrary local state.

AAAAT exposes MCP compatibility as a dependency-free descriptor/tool-schema surface through:

- `python -m aaaat.cli mcp-descriptor`
- `python -m aaaat.cli mcp-validate`

This is descriptor-only compatibility. AAAAT does not currently implement an MCP server transport such as stdio, SSE, or streamable HTTP, and agents should not configure AAAAT as a direct MCP server unless a real server transport is added later.

An external LLM app may first ask AAAAT for purpose-scoped context such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, `form_answers`, or `career_plan_review`. The LLM then submits one bounded action: create a candidature from already-inferred fields, store research/form-answer data, store cover-letter body text as render input, request local rendering, or request bounded future tasks.

The LLM is not the user and does not create final artifacts. AAAAT renders CVs and cover letters locally from templates, profile/application data, and explicit render inputs.

The browser dashboard is a compact local human working surface. Its routes are not an agent contract. Add new opportunities through dashboard raw-offer intake, user-directed local CLI use, or bounded agent actions; never by agents enumerating private data.

Do not place private values in public demos, source templates, docs, or examples.
