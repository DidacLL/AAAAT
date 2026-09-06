# Contributing

AAAAT v2 is developed through bounded GitHub Issues and short-lived branches. Start with AGENTS.md. The Mission selects a bounded capability from the masterplan and the Issue sets the acceptance boundary. Once product meaning is established, normal work and the next bounded Mission do not need routine owner approval.

Use Node 24 and the committed lockfile:

    npm ci
    npm run verify

Run Issue-specific runtime, visual, database, package, or TeX checks when the claim requires them.

Keep manual operation independent from AI, the renderer sandboxed, durable changes in application services, generated LaTeX portable and pdfLaTeX-compatible, and private data outside repository material. Do not add speculative providers, registries, plugins, workflows, services, or nonexistent-user compatibility.

Use agentic/<short-description> branches unless the active execution surface requires another convention. PRs state what works, evidence, material limitations, and any Class C ADR. Obtain independent review and resolve blockers. Use docs/engineering/EXECUTION.md for a real cross-surface handoff; do not commit one.
