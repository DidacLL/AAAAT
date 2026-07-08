# CLI

## Profile / CV Data

`variables` store scalar placeholders such as `profile.display_name` or `profile.email`.
`profile_facts` store structured professional/CV facts for future CV adaptation, cover letters, fit reasoning, recruiter prep, form answers, and market context.

Examples:

```powershell
aaaat profile fact add --type skill --title Python --body "Backend APIs and automation." --visibility professional --exposure summarized --use-for-cv --use-for-agent-context
aaaat profile fact list
aaaat profile fact show fact_123
aaaat profile fact update fact_123 --exposure placeholder --no-use-for-market-research
aaaat profile fact archive fact_123
aaaat profile context --purpose cv_generation
```

Each fact has editable visibility, exposure, and usage flags for CV, cover letter, agent context, market research, and dashboard use. Local/admin profile fact commands use internal IDs. Agent-scoped context uses non-ID `fact_ref` labels and placeholders.

Stable local commands:

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

Broad local CLI commands remain available for human/admin maintenance, but they are not the agent runtime contract.

`intake raw-offer` is a human/local AAAAT-originated flow. It creates a placeholder application with `company = "Pending extraction"`, `role = "Pending role"`, `status = "intake"`, and a user-created raw intake record. The deterministic review queue can then ask an agent to work on bounded task context.

Agent-facing runtime capabilities are task-handle and action-session scoped:

```bash
python -m aaaat.cli agent next
python -m aaaat.cli agent context <task_handle>
python -m aaaat.cli agent submit <task_handle> --result-body '{"result":"..."}'
python -m aaaat.cli agent submit <task_handle> --result-file result.json
python -m aaaat.cli agent context-bundle --purpose cover_letter
python -m aaaat.cli agent action submit --input-file action.json
python -m aaaat.cli agent action submit --input-body '{"action":"create_candidature","payload":{...}}'
```

`task_handle` is a task endpoint handle only. It may equal a local task row identifier in the MVP, but agent-facing commands must not treat it as authority to access or mutate arbitrary local records. Agent submit acknowledgements return only status, task handle/state, and next hints.

The HTTP agent runtime exposes the stricter machine-facing route set:

```text
GET  /api/agent/tasks/next
GET  /api/agent/tasks/{task_handle}/context
POST /api/agent/tasks/{task_handle}/result
POST /api/agent/context-bundle
POST /api/agent/actions
```

The agent runtime does not expose dashboard routes, broad entity lists, claim/release endpoints, or entity-ID mutation APIs.

The agent action-session capability supports LLM-app-originated work, not raw-offer upload or object CRUD. The LLM first asks for purpose-scoped context, then submits one bounded action.

The LLM-app-originated action may carry already-inferred candidature fields, company research, form answers, or cover-letter body text. AAAAT stores those values in local fields or render inputs. It does not create extraction or drafting tasks for work already supplied in the action.

Action acknowledgements are narrow and do not return internal AAAAT object identifiers.

For cover letters and CVs, the agent supplies data used by AAAAT templates. AAAAT renders generated files locally. The agent contract should not ask the LLM to submit final `.tex` or `.pdf` artifacts.

The agent is not the user. Agent-written text should land in explicit fields, task results, form answers, research/preparation fields, or render inputs, not in human note commands.

Durable production-sprint local commands:

```bash
python -m aaaat.cli task create --application-id <id> --type company_research --title "Research company"
python -m aaaat.cli task list
python -m aaaat.cli task show <task_id>
python -m aaaat.cli task complete <task_id> --result-body "..."
python -m aaaat.cli task apply <task_id>
python -m aaaat.cli todo create --application-id <id> --title "Follow up"
python -m aaaat.cli todo list
python -m aaaat.cli note add --application-id <id> --body "..."
python -m aaaat.cli note list --application-id <id>
python -m aaaat.cli blob add --application-id <id> --type company_research --body "..."
python -m aaaat.cli blob list --application-id <id>
python -m aaaat.cli keyword alias ATS "Applicant tracker"
python -m aaaat.cli keyword note ATS --body "..."
python -m aaaat.cli variable set display_name "Local User"
python -m aaaat.cli variable list
python -m aaaat.cli search "Python"
```

`profile set` is still supported, but new variable storage canonicalizes profile keys such as `display_name` and `summary.default` to stable placeholders such as `{{ profile.display_name }}` and `{{ profile.summary.default }}`.
