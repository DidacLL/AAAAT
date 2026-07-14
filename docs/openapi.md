# Agent adapter contract

AAAAT v1 uses the wx desktop as the human runtime. It does not ship the browser dashboard as the canonical human UI.

Agent-compatible work is bounded and capability-scoped. The preferred local adapter is the CLI:

```bash
aaaat agent next
aaaat agent context <task_handle>
aaaat agent packet <task_handle>
aaaat agent submit <task_handle> --result-file result.json
aaaat agent context-bundle --purpose cover_letter
aaaat agent action submit --input-file action.json
```

`task_handle` is an opaque bounded task handle for obtaining context and submitting one JSON result. It is not the local task row identifier and is not generic authority over local records. AAAAT owns applying task results to internal records through task binding.

Agent context returns self-contained task context with `task_handle`, `task_type`, `title`, `instructions`, `purpose`, `input_context`, `output_contract`, `response_format`, `allowed_actions`, and `privacy_notes`. Supported production-local task types are `field_inference`, `company_research`, `keyword_definition`, `draft_form_responses`, `draft_cv`, `draft_cover_letter`, and `career_plan_review`.

Agent result submission accepts a JSON result for that exact task handle. The result must not contain application IDs, candidature IDs, profile fact IDs, artifact IDs, task row IDs, storage paths, or file paths as mutation authority.

Purpose-scoped context bundles use exposure policy. Agent-scoped profile facts expose `fact_ref` labels and non-ID placeholders, not profile-fact row IDs. Career plans appear only in these bundles under `career_plans`, with `plan_ref` labels and no career-plan row IDs.

Supported context-bundle purposes include `cover_letter`, `cv_generation`, `candidature_fit`, `market_research`, `recruiter_call`, `form_answers`, and `career_plan_review`.

Bounded actions may carry source material and derived outputs. The first action is `create_candidature`. The payload supports these sections only: `source_material`, `candidature`, `outputs`, `render`, and optional `requested_tasks`.

`requested_tasks` is a list of small objects. Supported `task_type` values are `company_research`, `form_answers` or `draft_form_responses`, `cover_letter` or `draft_cover_letter`, `cv` or `draft_cv`, and `keyword_definition` with a `keyword`. AAAAT creates and binds accepted tasks internally to the new candidature. It skips follow-up tasks for outputs already supplied in the same action.

Example acknowledgement:

```json
{
  "status": "accepted",
  "action": "create_candidature",
  "created": true,
  "rendered": {"cover_letter": true},
  "queued": {"count": 1},
  "next": ["open_desktop"]
}
```

Agent-facing task acknowledgements contain only status, task handle/state, and next hints. Agent-facing action acknowledgements must remain narrow. Neither acknowledgement shape may return application, candidature, profile-fact, career-plan, artifact, storage, file-path, note, todo, blob, or task row identifiers as mutation handles.

Docs are descriptive, not the enforcement mechanism. Narrow service functions and capability-scoped adapters enforce the agent boundary. An agent with broader filesystem, shell, code-modification, or arbitrary local process access is outside AAAAT's full control.
