# Current execution state

## Active bounded work

[Issue #256](https://github.com/DidacLL/AAAAT/issues/256) is the sole active bounded product outcome on branch `product/external-host-setup-ui`.

The outcome is to make the already-demonstrated VS Code external-AI connection usable from normal **Settings → Portability & external tools** without requiring the user to construct CLI invocations, supply workspace/executable paths, or understand MCP configuration structure.

This is a usability completion of the existing ADR-0009 host integration and the #253 task-scoped external round trip. It does not authorize another host, generic host detection/registry/adapter infrastructure, new external tasks, broader data authority, provider/auth work, schema changes, release work, or changes to the task-relative privacy model established in `PRODUCT_DEFINITION.md` and ADR 0025.

Treat this as Class C because the desktop renderer gains a narrow trigger for an existing outside-workspace host-configuration mutation. Require one fresh independent Reviewer verdict on the exact final head. Skeptical Simplifier is required only if material abstraction appears beyond the single demonstrated VS Code case.

## Recently completed outcomes

[Issue #253](https://github.com/DidacLL/AAAAT/issues/253) and [PR #254](https://github.com/DidacLL/AAAAT/pull/254) are complete. External-AI access now has a demonstrated task-scoped round trip for one locally selected candidature: the external opportunity-research task receives a formatted projection of retained candidature information permitted by the existing AI-context preferences, without a fixed three-field allowlist or generic corpus/CRUD authority, and returned material can be retained only as a normal Source through the bounded Source-add operation. Selection and use are atomic at the SQLite boundary, and migrations 001–009 remain unchanged with task-selection state added by migration 010.

[Issue #250](https://github.com/DidacLL/AAAAT/issues/250) and [PR #251](https://github.com/DidacLL/AAAAT/pull/251) are complete. Existing CV-tailoring and cover-letter drafting are contextual to the current VCVGenerator document: candidature handoff context is reused automatically, standalone assistance asks only for genuinely missing candidature context, proposals remain deliberate, and dirty document state cannot be silently bypassed.

[Issue #247](https://github.com/DidacLL/AAAAT/issues/247) and [PR #248](https://github.com/DidacLL/AAAAT/pull/248) are complete. Standalone VCVGenerator output/result interaction is task-first: a user can create or edit a CV or cover letter, render it, and access the resulting user-owned output without external-AI permissions, candidature artifact administration, or source/audit details defining ordinary document work.

## Dormant compatibility evidence

[Issue #235](https://github.com/DidacLL/AAAAT/issues/235) remains open as a dormant reference to the first real-use baseline audit. It is not active work, a release decision, or a reason to stop ordinary autonomous work.

The archived technical record is [REAL_USE_BASELINE_EVIDENCE.md](../docs/engineering/REAL_USE_BASELINE_EVIDENCE.md). It becomes relevant only when the Product Owner explicitly asks to establish a real-use or release data baseline. Until then, development databases, fixtures, and development-era schema remain pre-baseline and may be corrected directly when current product meaning requires it.

## Current reading rule

Product Definition determines product meaning. Product Context and owner-source material inform interpretation only. SPEC supplies derived technical architecture. This file and linked live GitHub state select execution; neither can redefine the product.
