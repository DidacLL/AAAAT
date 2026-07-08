# Release checklist

Use this checklist to decide whether AAAAT is ready for its intended scope: single-user, local-first, provider-agnostic production use.

Do not evaluate this release as SaaS, multi-user infrastructure, or a public network service.

## Scope

- [ ] Release notes clearly say AAAAT is single-user and local-first.
- [ ] Docs do not imply SaaS, remote hosting, multi-user accounts, or enterprise auth.
- [ ] Docs do not claim provider-specific behavior.
- [ ] Docs do not claim AAAAT calls an LLM internally.
- [ ] MCP wording matches the implemented descriptor/schema surface.

## Install and launch

- [ ] Fresh checkout installs with Python 3.11+.
- [ ] `python -m pip install -e .` succeeds.
- [ ] `aaaat --version` works.
- [ ] `python -m aaaat.cli --version` works.
- [ ] `aaaat init` creates local private storage.
- [ ] `aaaat init` is safe to run more than once.
- [ ] `aaaat launch` starts the dashboard.
- [ ] Dashboard binds to `127.0.0.1` by default.
- [ ] `aaaat launch --read-only` starts read-only dashboard mode.
- [ ] `aaaat launch --agent-api` starts the bounded agent runtime.

## Local data and privacy

- [ ] `.private/` is ignored.
- [ ] SQLite database files are ignored.
- [ ] Generated outputs and local artifacts are ignored unless intentionally committed as fake examples.
- [ ] No real CV data, recruiter messages, offers, notes, rendered letters, or backups are committed.
- [ ] Static demo export uses `examples/demo_payload.json` or another explicitly fake payload.
- [ ] Visual assets under `aaaat/templates-ui/assets/` are private-safe.
- [ ] Manual backup/restore procedure is documented.

## Dashboard behavior

- [ ] Dashboard displays candidatures, selected details, tasks, profile context, and artifacts without requiring external services.
- [ ] Full local mode supports intended write actions.
- [ ] Read-only mode removes or blocks write controls.
- [ ] Read-only write attempts return a forbidden response.
- [ ] Dashboard routes are not documented as agent APIs.

## Agent-compatible behavior

- [ ] Agent runtime exposes only bounded task/context/action routes.
- [ ] Agent runtime does not expose dashboard HTML, fragments, form actions, OpenAPI docs, broad lists, broad search, or CRUD surfaces.
- [ ] Task context is scoped to one task handle.
- [ ] Task packets include enough instruction and response-shape material for external processing.
- [ ] Task result submission writes only to the bound task.
- [ ] Action acknowledgements are narrow and avoid returning internal object identifiers as mutation authority.
- [ ] Context bundles expose only purpose-scoped profile/career material.
- [ ] Agent flow remains optional; manual dashboard/CLI use still works.

## Artifact generation

- [ ] `aaaat render cv` produces a local output file.
- [ ] `aaaat render cover-letter <application_id>` produces a local output file.
- [ ] Artifact records can be saved and listed.
- [ ] Artifact state can be updated to `draft`, `reviewed`, `submitted`, or `archived`.
- [ ] Generated artifacts remain local and require human review before submission.

## Static demo

- [ ] `aaaat export static-demo outputs/static-demo.html` succeeds.
- [ ] Static demo contains fake data only.
- [ ] Static demo has no backend write controls.
- [ ] Static demo does not read `.private/`.

## Tests and guardrails

- [ ] `python -m pytest` passes.
- [ ] `python tools/repo_guard.py` passes.
- [ ] Dependency policy remains lightweight.
- [ ] Package data includes required templates and static assets.
- [ ] No heavy documentation site, migration framework, frontend framework, or provider SDK dependency was added without a concrete reason.

## Release decision

AAAAT can be called production-ready for this project when it reliably works as a local single-user application that stores private data locally, renders the local dashboard, supports read-only inspection, exposes bounded optional agent-compatible surfaces, generates local artifacts, exports fake static demos, and documents local data/backup limits clearly.
