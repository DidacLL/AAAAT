# Current execution state

## Active bounded work

None. [Issue #259](https://github.com/DidacLL/AAAAT/issues/259) and [PR #260](https://github.com/DidacLL/AAAAT/pull/260) are complete.

No successor Mission or implementation Issue is selected here. The next step is project-level reevaluation by the primary orchestrator against the current Product Definition and live `main` state.

## Recently completed outcomes

[Issue #259](https://github.com/DidacLL/AAAAT/issues/259) and [PR #260](https://github.com/DidacLL/AAAAT/pull/260) are complete. Sparse candidature capture remains Source-first and manual/no-AI complete, while a selected validated job-extraction route now appears immediately as part of the saved-capture result rather than behind a separate post-save AI discovery step. The user sees the selected connection type and exact retained Source material before requesting extraction, may keep the candidature without AI, and reviews deliberate ordinary-information proposals before any field mutation. Extraction failure leaves the saved candidature/Source intact, and proposal dirty state clears when the result is dismissed.

[Issue #256](https://github.com/DidacLL/AAAAT/issues/256) and [PR #257](https://github.com/DidacLL/AAAAT/pull/257) are complete. The already-demonstrated VS Code external-AI connection is now usable from **Settings → Portability & external tools** through a renderer operation that accepts no paths, executable, configuration, or selectors. The trusted main process owns project-folder selection, current workspace and packaged executable resolution, and reuses the existing ADR-0009 proposal/activation path with live MCP verification, compatible-entry preservation, conflict refusal, and VS Code-owned trust. The CLI setup path remains available, and the #253/ADR-0025 task-relative privacy model is unchanged.

[Issue #253](https://github.com/DidacLL/AAAAT/issues/253) and [PR #254](https://github.com/DidacLL/AAAAT/pull/254) are complete. External-AI access now has a demonstrated task-scoped round trip for one locally selected candidature: the external opportunity-research task receives a formatted projection of retained candidature information permitted by the existing AI-context preferences, without a fixed three-field allowlist or generic corpus/CRUD authority, and returned material can be retained only as a normal Source through the bounded Source-add operation. Selection and use are atomic at the SQLite boundary, and migrations 001–009 remain unchanged with task-selection state added by migration 010.

[Issue #250](https://github.com/DidacLL/AAAAT/issues/250) and [PR #251](https://github.com/DidacLL/AAAAT/pull/251) are complete. Existing CV-tailoring and cover-letter drafting are contextual to the current VCVGenerator document: candidature handoff context is reused automatically, standalone assistance asks only for genuinely missing candidature context, proposals remain deliberate, and dirty document state cannot be silently bypassed.

[Issue #247](https://github.com/DidacLL/AAAAT/issues/247) and [PR #248](https://github.com/DidacLL/AAAAT/pull/248) are complete. Standalone VCVGenerator output/result interaction is task-first: a user can create or edit a CV or cover letter, render it, and access the resulting user-owned output without external-AI permissions, candidature artifact administration, or source/audit details defining ordinary document work.

## Dormant compatibility evidence

[Issue #235](https://github.com/DidacLL/AAAAT/issues/235) remains open as a dormant reference to the first real-use baseline audit. It is not active work, a release decision, or a reason to stop ordinary autonomous work.

The archived technical record is [REAL_USE_BASELINE_EVIDENCE.md](../docs/engineering/REAL_USE_BASELINE_EVIDENCE.md). It becomes relevant only when the Product Owner explicitly asks to establish a real-use or release data baseline. Until then, development databases, fixtures and development-era schema remain pre-baseline and may be corrected directly when current product meaning requires it.

## Current reading rule

Product Definition determines product meaning. Product Context and owner-source material inform interpretation only. SPEC supplies derived technical architecture. This file and linked live GitHub state select execution; neither can redefine the product.
