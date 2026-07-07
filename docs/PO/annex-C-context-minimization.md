# Annex C — Task Context Minimization

## General rules
Task context must be built deterministically by `aaaat.agent_access`.

Never build agent context by returning dashboard payload.
Never call `get_candidature(..., include_related=True)` directly inside the agent adapter.
Never include unrelated candidatures.
Never include all notes, artifacts, text blobs, variables, or profile facts by default.

Every context response should contain:

```json
{
  "task": {"id": "...", "task_type": "...", "title": "...", "instructions": "...", "context_hint": "..."},
  "context": {},
  "privacy": {"scope": "agent", "notes": []},
  "allowed_actions": ["submit", "claim", "release"]
}
```

## Field inference
Include only:

- task metadata;
- the target application/candidature id;
- raw source material needed for extraction;
- explicitly empty/missing target fields;
- existing non-empty values only as protected/conflict context if needed, not as a broad dump.

Do not include unrelated notes, artifacts, profile context, or full candidature details.

## Company research
Include only:

- company name if known;
- role if needed;
- source URL if known;
- narrow instructions/context hint.

Do not include full job-search history or unrelated candidatures.

## Keyword definition
Include only:

- keyword literal;
- aliases/context hint if available;
- minimal role/domain hint if useful.

Do not include full candidature object.

## Draft form responses
Include only:

- raw application form/questions;
- relevant candidature fields;
- privacy-filtered profile context for `form_answers` purpose.

## Draft CV / cover letter
Include only:

- relevant application/company/role facts;
- relevant keywords;
- privacy-filtered profile context for `cv_generation` or `cover_letter` purpose;
- artifact slot/provenance target.

Do not expose raw local profile values unless the stored exposure policy explicitly allows raw agent exposure.

## Write-back hints
Do not point agents to broad routes such as `/api/tasks/{id}/complete`, `/api/tasks/{id}/apply`, or `/api/text-blobs` in context.

Use task-scoped write-back only:

```text
/api/agent/tasks/{task_id}/result
/api/agent/tasks/{task_id}/claim
/api/agent/tasks/{task_id}/release
```
