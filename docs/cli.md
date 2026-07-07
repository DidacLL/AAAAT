# CLI

Stable MVP commands:

```bash
python -m aaaat.cli init
python -m aaaat.cli launch
python -m aaaat.cli launch --read-only
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

`intake raw-offer` creates a placeholder application with `company = "Pending extraction"`, `role = "Pending role"`, `status = "intake"`, and a user-created raw intake record. The deterministic review queue then tells an agent what to extract.

Durable production-sprint commands:

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
