# Contributing

AAAAT v2 is developed through bounded GitHub Issues and short-lived branches.

Before working, follow [`AGENTS.md`](AGENTS.md), the canonical [`docs/SPEC.md`](docs/SPEC.md), the current Mission, and relevant ADRs. The Issue defines the acceptance boundary; do not expand it with future-Mission scaffolding.

## Toolchain

M0 uses Node 24 and npm with exact dependency pins in `package.json` and `package-lock.json`.

Install and verify with:

```text
npm ci
npm run verify
```

Run Issue-specific runtime, visual, database, or packaging checks in addition to the fast path when the claim requires them.

## Contribution rules

- Keep manual operation independent from AI.
- Keep the Electron renderer sandboxed and unprivileged.
- Route durable mutations through application services.
- Keep generated LaTeX portable and user-owned.
- Keep private and personal data outside source, fixtures, screenshots, Issues, and PRs.
- Use fictional examples only when a behavior test genuinely needs domain data.
- Do not add speculative providers, registries, plugins, workflows, services, or compatibility layers.
- Test durable behavior and boundaries, not incidental wording or file layout.

## Pull requests

Use short-lived `agentic/<short-description>` branches unless the active execution surface requires another convention. Describe the result, executable verification, actual limitations, and any Class C ADR. Obtain independent review and resolve blocking findings before integration. When work changes surfaces, use the compact contract in [`docs/engineering/EXECUTION.md`](docs/engineering/EXECUTION.md); do not commit task-specific handoff files.
