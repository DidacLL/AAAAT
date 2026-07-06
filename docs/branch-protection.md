# Branch protection

Recommended protection for `main` after merging the CI workflow:

1. Require a pull request before merging.
2. Require status checks to pass before merging.
3. Required status check: `contract`.
4. Require branches to be up to date before merging.
5. Do not allow force pushes.
6. Do not allow deletions.
7. Keep administrator bypass disabled unless emergency maintenance requires it.

This policy is intentionally small. It protects the accepted AAAAT contract without adding release gates, coverage thresholds, code owners, deployment environments, provider-specific checks, or permanent architecture bans.

The `contract` check runs:

```text
python -B tools/architecture_guard.py
python -B -m compileall -q aaaat tests tools
python -B -m unittest discover -s tests
python -B -m aaaat.cli mcp-validate
```

The contract guard checks durable invariants only:

- the runtime package exists;
- no committed private SQLite/database storage;

Dependencies, frontend assets, HTTP clients, and web frameworks are allowed when they are justified by the product direction and documented in the relevant implementation notes. The `contract` check is contract verification, not architecture freezing.

It deliberately does not check exact CSS, exact dashboard wording, fake company names, dependency count, framework choice, temporary branch names, or implementation-coupled UI details.
