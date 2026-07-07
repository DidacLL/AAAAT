# Development guardrails

CI runs `python -B tools/repo_guard.py --ci`.

The guard fails when Git tracks local or generated files:

- `.private/`
- `*.sqlite`
- `*.sqlite3`
- `*.db`
- `__pycache__/`
- `*.pyc`
- `*.pyo`

The guard also checks required `.gitignore` rules.

These checks protect local storage. They do not ban future justified dependencies, frontend code, web frameworks, or HTTP clients.

M3 dashboard/API regression checks:

- `python -B -m unittest tests.test_fastapi_server`
- `python -B -m unittest tests.test_dashboard_views`
- `python -B -m unittest tests.test_domain_services`
- `python -B -m unittest tests.test_static_export`
- `python -B -m unittest discover -s tests`
- `python -B -m aaaat.cli mcp-validate`

Do not weaken the repository guard when `git` is missing from a local PATH. Run the full suite in CI or a shell where `git --version` works.

`main` should require pull requests and the `contract` status check. Force pushes and branch deletion should be disabled.

Assistants and agents must not close, merge, rebase, retarget, force-reset, or commit to `main` without explicit approval for that exact action.
