# AAAAT v1 drift audit — 2026-07-13

Base authority for this branch is accepted PR37 state `97b2e474d4c609002a4c786f81c60446e3b0be5e`. Later PRs and generated plans are evidence only.

## Findings

1. HTTP/browser runtime drift

The accepted branch still carried FastAPI/Uvicorn/Jinja packaging and browser dashboard modules. Current v1 direction makes wx desktop the only human runtime and forbids HTTP serving, ports, browser dashboard, browser demo/export, and browser security machinery. Therefore browser runtime hardening is not a v1 release task; removal is.

2. Status model drift

Existing storage and CLI paths still allowed historical workflow statuses such as `draft` and `intake`. v1 only has `active` and `closed`; non-terminal legacy states must normalize to `active`, terminal legacy states to `closed`.

3. Field registry drift

Detailed View had its own field policy inside the wx adapter. v1 requires one canonical field registry so storage keys, editability, grouping, choices, and read-only rationale do not diverge across adapters.

4. Render failure drift

PDF compile failures were treated as non-fatal while still saving a TeX artifact. v1 requires render failure to fail the task rather than leaving work completed with a degraded artifact.

5. PR42 evidence boundary

PR42 is useful evidence for task registry, bounded adapters, and non-blocking worker ideas, but it is not a reusable authority. It remains a draft based on PR37 and must not be inherited wholesale.

## First-wave correction in this branch

- Removed FastAPI/Uvicorn/Jinja/python-multipart/httpx package posture.
- Removed the FastAPI runtime module and browser dashboard modules.
- Disabled legacy HTTP launch and static-demo export entrypoints.
- Added canonical candidature field registry.
- Routed wx Detailed View field semantics through the canonical registry.
- Normalized candidature statuses to `active`/`closed` at creation, update, read, and initialization migration.
- Made requested PDF compilation failures raise `RenderFailure` before artifact persistence.

## Not complete

This is only the first cleanup wave. Remaining work includes CLI/help cleanup, browser/static/template/test deletion, full worker queue semantics, atomic field revision/provenance updates, automatic analysis/evaluation/strategy tasks, explicit CV/letter generation from current edited inputs, immutable artifact version paths, sent lifecycle events, User View AUI workspace completion, support dialogs, wheel/launcher installation tests, and a full green test run.
