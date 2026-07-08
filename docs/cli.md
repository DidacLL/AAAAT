# CLI

AAAAT CLI commands fall into two groups: local human/admin commands and agent-facing capability commands. Broad local commands remain useful for the user and for maintenance, but they are not the agent contract.

## Local human/admin commands

`variables` store scalar placeholders such as `profile.display_name` or `profile.email`. `profile_facts` store structured professional/CV facts for future CV adaptation, cover letters, fit reasoning, recruiter prep, form answers, and market context.

Examples:

```powershell
aaaat profile fact add --type skill --title Python --body "Backend APIs and automation." --visibility professional --exposure summarized --use-for-cv --use-for-agent-context
aaaat profile fact list
aaaat profile fact show fact_123
aaaat profile fact update fact_123 --exposure placeholder --no-use-for-market-research
aaaat profile fact archive fact_123
aaaat profile context --purpose cv_generation
```

Each fact has editable visibility, exposure, and usage flags for CV, cover letter, agent context, market research, and dashboard use.

Stable local commands include:

```bash
python -m aaaat.cli init
python -m aaaat.cli launch
python -m aaaat.cli launch --read-only
python -m aaaat.cli launch --agent-api
python -m aaaat.cli app create --company "Example Co" --role "Backend Engineer"
python -m aaaat.cli app update <id> --next-action "Call recruiter" --keywords "ATS, Python"
python -m aaaat.cli app list
python -m aaaat.cli app show <id>
python -m aaaat.cli intake add <id> --content "..."
python -m aaaat.cli intake raw-offer --content "Paste raw offer text here"
python -m aaaat.cli glossary set ATS --definition "Applicant tracking system" --category recruiting
python -m aaaat.cli profile missing
python -m aaaat.cli profile set display_name "Local User"
python -m aaaat.cli review-queue
python -m aaaat.cli review-queue <application_id>
python -m aaaat.cli artifact list <id>
python -m aaaat.cli artifact save --application-id <id> --type cover_letter --path local/cover.pdf --label "Cover letter"
python -m aaaat.cli artifact update-state <artifact_id> --state reviewed --notes "Ready"
python -m aaaat.cli render cv
python -m aaaat.cli render cover-letter <id>
python -m aaaat.cli export static-demo outputs/static-demo.html
python -m aaaat.cli agent-guide
```

`intake raw-offer` is a human/local AAAAT-originated flow. It creates a placeholder application with `company = "Pending extraction"`, `role = "Pending role"`, `status = "intake"`, and a user-created raw intake record. The deterministic review queue can then ask an agent to work on bounded tasks.

Durable production-sprint local commands may also include task, todo, note, blob, keyword, variable, and search commands. These local commands can use internal IDs because they are user/admin tools, not agent authority.

## Agent-facing CLI contract

Agent-facing CLI commands should mirror the agent runtime capabilities rather than local CRUD. The intended shape is:

```bash
python -m aaaat.cli agent next
python -m aaaat.cli agent context <task_handle>
python -m aaaat.cli agent submit <task_handle> --result-file result.json
python -m aaaat.cli agent submit <task_handle> --result-body '{"result":"..."}'
python -m aaaat.cli agent context-bundle --purpose cover_letter
python -m aaaat.cli agent action submit --input-file action.json
python -m aaaat.cli agent action submit --input-body '{"action":"create_candidature","payload":{...}}'
```

A task handle is not an internal entity ID. It may only be used to fetch bounded context and submit a JSON result for that task. AAAAT owns applying the result to internal records.

The agent action-session capability supports LLM-app-originated work, not raw-offer upload, dashboard actions, or object CRUD. The LLM first asks for purpose-scoped context, then submits one bounded action.

The `create_candidature` action may carry already-inferred candidature fields, source material, company research, form answers, cover-letter body text, render requests, and requested future tasks. AAAAT stores those values locally, renders local templates when requested, and queues future bounded work only through AAAAT-owned task creation.

Action acknowledgements are narrow and do not return internal AAAAT object identifiers, storage paths, or entity mutation handles.

For cover letters and CVs, the agent supplies data used by AAAAT templates. AAAAT renders generated files locally. The agent contract should not ask the LLM to submit final `.tex` or `.pdf` artifacts.

The agent is not the user. Agent-written text should land in explicit fields, task results, form answers, research/preparation fields, render inputs, or requested future tasks, not in human note commands.

`profile set` is still supported, but new variable storage canonicalizes profile keys such as `display_name` and `summary.default` to stable placeholders such as `{{ profile.display_name }}` and `{{ profile.summary.default }}`.
