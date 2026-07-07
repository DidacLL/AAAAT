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

`main` should require pull requests and the `contract` status check. Force pushes and branch deletion should be disabled.

Assistants and agents must not close, merge, rebase, retarget, force-reset, or commit to `main` without explicit approval for that exact action.
