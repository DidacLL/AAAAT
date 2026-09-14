# Current execution state

## Active bounded work

None.

Issue #314 — Rebuild Candidatures around two-state Focus, raw capture, direct editing and Tags — is complete.

PR #316 merged into `main` as `81668a992a30fe393934f75cf19176addd7aa229`.

The implementation branch `product/rebuild-candidatures` is retired as execution authority. Do not continue work from it or from another pre-merge branch.

## Current product baseline

The merged candidature model is now the baseline:

- corpus Focus starts with no forced selection and shows only deliberately Focus-selected fields/signals;
- selecting a candidature transitions to selected-candidature Focus using the available screen;
- selected Focus is read-first but directly editable for displayed fields;
- complete candidature work is independently reachable;
- candidature field definitions are user-maintainable product data, not a fixed profession-specific ontology;
- New candidature has two peer approaches: direct field entry and raw-material capture;
- raw capture retains a Source first, then offers explicit AI-assisted or manual Source-to-fields continuations;
- Tags are the shared glossary/tag model; `Concepts` is not a parallel product/domain vocabulary;
- no lifecycle/status/priority/next-action/completeness architecture is part of the candidature model;
- development-only migration ancestry and the obsolete global ToDo runtime are not compatibility requirements;
- local/manual/no-AI operation, Sources, search, document handoffs, bounded AI and privacy boundaries remain preserved.

## Next activation rule

No successor issue is active.

The next bounded mission must be chosen deliberately from current owner/product priorities and start from current `main` plus the current product authority. Do not infer a successor merely from #314 exclusions, historical plans, old branches, or leftover implementation structures.

Before activating new work, verify that the issue is independently valuable and does not reintroduce superseded candidature, lifecycle, Concept, migration-compatibility, reminder-hub, or in-app job-discovery assumptions.
