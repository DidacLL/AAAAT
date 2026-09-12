# Current execution state

## Active bounded work

**Issue #314 — Rebuild Candidatures around two-state Focus, raw capture, direct editing and Tags**

Branch: `product/rebuild-candidatures`

Exact base: `main` at `5adf115d2b020914afe02ec336cc48a95b09ea71` (PR #315, recovered product/UX authority).

Pre-recovery work is retired. Issue #304 is closed and PR #312 is closed unmerged. Do not reuse their branches or treat their implementation as authority.

## Product outcome

Replace the current selected-record-first candidature UI with the recovered AAAAT candidature model:

- **Corpus Focus** starts with no forced selection and shows multiple recognizable candidatures using only a small configured/default set of Focus fields/signals.
- Selecting one candidature transitions to **selected-candidature Focus** using the available screen rather than expanding a cramped card or preserving a permanent list/detail split.
- Selected Focus is read-first but directly editable for displayed fields.
- Tags are contextual shared glossary/wiki knowledge and replace the competing `Concepts` product/domain vocabulary.
- Complete candidature work is independently reachable and exposes all information/Sources/Tags/application material through progressive disclosure.
- New candidature capture is raw-material-first: retain whatever the user has without requiring dedicated title/URL/source-kind/lifecycle fields.
- Saving capture must not force one universal next journey.
- Reminders, Sources, documents and Activity do not become default Focus clutter.
- No lifecycle/status/priority/next-action/completeness machinery is introduced.

## Preserve where independently justified

- local authoritative workspace and manual/no-AI operation;
- flexible candidature field/value model and future user-maintainable field direction;
- first-class Sources and full Source readability;
- useful candidature search semantics;
- candidature ↔ VCVGenerator handoffs and application-material relationships;
- archive as secondary corpus organization;
- dirty-state protection;
- bounded optional AI extraction/field assistance;
- narrow renderer/preload/main mutation boundaries.

## Excluded

- professional-information taxonomy redesign;
- VCVGenerator redesign;
- provider/integration redesign;
- job discovery;
- lifecycle/status/priority/next-action features;
- reminder/task-management expansion;
- generic dashboard/framework work;
- compatibility with development-only workspace schemas.

## Review / evidence

Treat #314 as Class C. Require independent Reviewer and Skeptical Simplifier assessment after implementation.

Verification must protect behavior rather than the new component arrangement. Packaged `720×600` evidence must cover corpus Focus → selected Focus → inline edit → back, plus direct complete-candidature entry.

Do not activate a successor until #314 is complete and reconciled against the recovered product authority.