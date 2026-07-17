# Contributing

AAAAT is a local-first desktop application with a deliberately narrow external-AI
boundary. Contributions must preserve that product and authority model.

## Setup

Use Python 3.11, 3.12, or 3.13.

```text
python -m pip install -e .[desktop]
```

Install the `release` extra only when working on native packaging.

## Checks

Run before opening a pull request:

```text
python -B -m compileall -q aaaat tests tools scripts
python -B -m aaaat.cli mcp-validate
python -B -m unittest discover -s tests
```

Release changes also require:

```text
python tools/build_release.py
python tools/verify_release.py
```

## Contribution rules

- Keep the wx desktop fully usable without an AI.
- Keep private data outside the repository and fixtures.
- Use fictional examples.
- Preserve provider and host neutrality.
- Do not add broad agent CRUD, provider SDKs, connector management, telemetry,
  plugin frameworks, workflow engines, or heavy dependencies.
- Keep widgets behind desktop services rather than direct SQL writes.
- Prefer one canonical implementation; remove internal duplicates rather than
  preserving aliases without a released compatibility contract.
- Add tests for durable behavior, not exact wording, branch history, or private
  helper structure.
- Update the relevant human documentation when product or technical behavior changes.

## Pull requests

Use a focused branch and coherent commits. Describe:

- the problem and resulting behavior;
- affected product or authority boundaries;
- validation performed;
- any deliberate limitation.

Do not include private workspace data, generated databases, personal application
material, build output, or local release archives.
