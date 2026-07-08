# Agent Guide

Agents interact with AAAAT through capability-scoped operations, not generic CRUD. A task is the primary implemented capability.

The contract has two directions and they must not be confused.

## AAAAT-originated work

When work starts inside AAAAT, AAAAT creates a task. The agent receives a narrow task packet, completes the task externally, and submits a task result. AAAAT stores provenance and applies the result only through deterministic local review/apply flows.

Implemented task commands:

```bash
python -m aaaat.cli agent tasks --state queued
python -m aaaat.cli agent context <task_id>
python -m aaaat.cli agent submit <task_id> --result-file result.json
python -m aaaat.cli agent claim <task_id>
python -m aaaat.cli agent release <task_id>
```

The optional HTTP adapter exposes equivalent task operations under `/api/agent/*`. `aaaat launch --agent-api` starts an agent HTTP surface with `/api/health` and capability-scoped `/api/agent/*` routes.

Task contexts are minimized by `aaaat.agent_access`. They include a sanitized task envelope, task-specific context, privacy notes, and task-scoped write-back links. They do not include dashboard payloads or private database browsing surfaces.

## LLM-app-originated work

When work starts in the LLM app, the LLM has already read the offer, interpreted the conversation, and produced the useful data before calling AAAAT. In this direction AAAAT should not create extraction tasks for the same completed work.

The correct future capability is an action-session protocol:

```bash
python -m aaaat.cli agent context-bundle --purpose cover_letter
python -m aaaat.cli agent action submit --input-file action.json
```

First, the LLM asks AAAAT for a purpose-scoped context bundle. Supported purposes should map to existing profile-context purposes such as `cv_generation`, `cover_letter`, `candidature_fit`, `recruiter_call`, and `form_answers`. AAAAT returns only the context allowed for that purpose and exposure policy.

Then the LLM submits one bounded action. Examples of bounded actions are:

- create a candidature from fields the LLM has already inferred;
- store company-research or preparation fields the LLM has already written;
- store form answers the LLM has already written;
- store a cover-letter body as render input for the local template;
- request local rendering from AAAAT templates;
- submit the result for an existing AAAAT task.

AAAAT should acknowledge the action and perform local storage/rendering. The agent contract should not depend on internal AAAAT object identifiers.

## Artifact boundary

Agents do not create final artifact files for AAAAT. AAAAT renders artifacts locally from templates and stored data.

For cover letters, the LLM may supply the body text that fills the local `artifact.cover_letter.body` template variable. AAAAT renders the `.tex` file and optional PDF locally, then stores the generated artifact record.

For CVs, the LLM should supply or improve the data used by the CV template, not submit a generated CV file.

## Human/user boundary

The agent is not the user. Agent-supplied text should land in explicit candidature fields, task results, form answers, research/preparation fields, or render inputs. Human notes remain a local user/dashboard concept unless a future bounded action explicitly defines agent-authored machine notes separately.

The browser dashboard is a local human UI. Its action routes are form/htmx-oriented internals and are not an agent contract.

Docs do not enforce security by themselves. Route absence, narrow service functions, and capability-scoped adapters reduce accidental over-exposure. If an agent has direct `.private/`, shell, code modification, or arbitrary localhost access while the dashboard server is running, AAAAT cannot fully constrain it.

Aggregate candidature lists are private behavioral data.
