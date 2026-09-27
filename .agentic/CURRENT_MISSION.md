# Current mission — recover PLAN[4]/PLAN[5] acceptance boundary

Current explicit Product Owner instruction remains highest authority.

Base main: `dd16cacd9233084bfec1b13755942eb7aa51d469`.

PLAN[0]/[1]/[3] remain retained. PLAN[2] remains complete on its previously demonstrated real-host boundaries. **PLAN[4] is active and not accepted. PLAN[5] is blocked and not accepted.**

This state corrects the prior coordination error that treated a sequence of green implementation slices as sufficient PLAN acceptance. Merged code may remain useful implementation material and evidence; it is not product authority and is not preserved merely because it exists.

## Execution model

The master orchestrator owns sequencing, authority recovery, design interpretation, repository/code review, real-boundary evidence, PR creation/merge and PLAN acceptance.

The Product Owner is not a routine QA or audit layer. Escalate only a genuine unresolved product choice after exhausting repository authority. Do not ask the Product Owner to validate screens, diffs, tests or historical requirements that the orchestrator can inspect directly.

Substantial implementation belongs to one bounded specialist only after the orchestrator has established the coherent product boundary. Do not split UX/UI work into narrow mechanical patches that individually satisfy tests while bypassing the intended complete interaction.

## PLAN[4] audit status

The merged document implementation contains substantial correct work that should be retained where it matches authority:

- LaTeX2e public API with expl3 internals;
- pdfLaTeX / `latexmk` production rendering;
- TypeScript-owned generated `data.tex`;
- semantic Blueprint-independent CV section roles `main` / `secondary`;
- one Blueprint contract covering CV and cover-letter presentation;
- render-time user Blueprint discovery/selection without Blueprint persistence on editable documents;
- CV Template / Working CV / Rendered CV ownership separation;
- immutable rendered snapshots and duplicate/resume behavior;
- packet cover-letter rendering through the exact Blueprint retained by the selected Rendered CV;
- bounded Latin-script Babel handling with explicit unsupported-language failure;
- exact retained/exportable portable projects;
- strong multipage/content-survival real-LaTeX evidence.

Those mechanisms do **not** yet close PLAN[4].

ADR 0015 and the pre-completion PLAN[4] record require user-owned editable Blueprints **and modified package sources**. Issue #344 explicitly deferred persistent reuse/selection of modified Blueprint/package sources as later PLAN[4] design debt. Issue #351 subsequently implemented persistent user Blueprint discovery, but the live renderer still always injects the embedded shipped `aaaat.sty`. An advanced user's modified shared package source therefore cannot currently be reused by later AAAAT renders.

Issue #373 is the active coherent PLAN[4] completion outcome. It must establish the final user-owned shared package-source model, preserve the correct existing document semantics, and revalidate the complete package/Blueprint/CV/letter/packet boundary. Closing #373 does not itself declare PLAN[4] complete; the orchestrator makes the PLAN decision only after independent full-boundary review.

Issues #344, #351 and #355 remain closed as implementation-slice history. Their closure is not a PLAN-completion claim.

## PLAN[5] audit status

PLAN[5] is blocked until PLAN[4] is genuinely accepted.

The merged renderer work from Issues #360, #362, #365 and #369 may contain useful behavior—read-first Working CV editing, read-first My information, candidature-field state consolidation and Tag glossary/visor behavior—but those slices are **not accepted as the PLAN[5] UX/UI outcome**. Their implementations must be judged as salvageable material inside the eventual coherent design, not as constraints on that design.

The prior PLAN[5] execution incorrectly followed only the narrow deferred headings in the roadmap and omitted the still-open owner-acceptance boundary in Issue #314. The blocking acceptance correction on #314 remains authoritative where it agrees with the current Product Definition. In particular, later visible-UI work must not omit:

- retrieval/capture-first Applications composition rather than administration-first UI;
- ordinary information language rather than schema/developer vocabulary;
- the two direct New application approaches required by `PRODUCT_DEFINITION.md`;
- raw material retention followed by simultaneous explicit **Send to AI** and **Fill manually** continuations;
- coherent low-friction direct entry rather than a procession of isolated record forms;
- read-first professional information and document editing;
- contextual AI-use controls that do not become separate competing mechanisms;
- productive use of available desktop space and one principal task at constrained sizes;
- first-run workspace entry that fits without branding displacing Create/Open;
- intentional sparse/empty-state composition;
- the actual AAAAT visual language rather than generic SaaS styling.

The current New application implementation is a known structural mismatch: it combines pasted Source material and all fields in one form and offers pre-save `Parse with AI`; the canonical Product Definition instead requires two direct creation approaches and, after raw retention, peer AI/manual continuations in the same post-retention view. Do not patch wording around the current composition; redesign the interaction from the product intention.

## Mandatory visual authority for future PLAN[5]

`docs/UX_VISUAL_DIRECTION.md` must be read for **every visible UI implementation run**. It is not optional styling inspiration.

The target is friendly worn retrofuturism with professional information clarity: repaired field terminal / workshop instrument for machine surfaces, paper/dossier treatment for readable information, restrained mid-century industrial cues, warm weathered materials and clear accessible content. It explicitly rejects generic SaaS minimalism, generic developer-dashboard styling, neon cyberpunk and decoration that harms readability.

Historical visual research assets in `docs/owner-source/` must be inspected directly when designing the visible shell/Home/onboarding/theme work:

- `AAAATART.png`
- `AAAATlogo.png` / `AAAATlogolight.png`
- `AAAATbanner.png` / `AAAATbannerlight.png`
- `AAAATbg.png` / `AAAATbglight.png`
- `AAAATloading.png` / `AAAATloadinglight.png`

The current renderer imports only the light logo and declares `color-scheme: light`; paired historical dark/light assets therefore remain unexploited design evidence. Do not create a heavy theme framework merely to use them, but future coherent UX/UI design must explicitly decide and verify light/dark presentation rather than accidentally shipping one fixed appearance.

## Loaded Home — Product Owner decision

When PLAN[5] resumes, loaded Home is a **branded landing console**.

It combines AAAAT product identity with concise useful operational shorthand. It is neither a bare launcher nor a generic metrics dashboard.

Once a workspace is loaded:

- Home must not offer `New workspace`, `Open existing workspace`, `Open demo` or equivalent workspace-entry buttons as primary landing content;
- workspace switching/creation belongs in a compact shell/options interaction or a deliberate interaction on the displayed workspace/path, with full administration still available in Settings;
- Home may surface useful local/workspace state, ongoing work/tasks and clear continuations into ordinary work without redundantly reproducing every persistent rail badge;
- branding/art supports the landing composition but must not consume the useful work area.

This explicit Product Owner decision resolves the former `UX_DEFINITION.md` versus older roadmap Home conflict. Derived UX documentation must be corrected before/with the eventual PLAN[5] implementation so agents do not recover the obsolete either/or interpretation.

## PLAN[5] acceptance method

Do not accept PLAN[5] from component tests alone.

The final coherent visible-UX candidate must be reviewed across the real product surfaces and verify:

- first run;
- loaded Home/shell;
- Applications corpus, selected application and both creation routes;
- My information;
- CV/Documents editing and collection;
- Tags and rail visor;
- Settings;
- meaningful empty/sparse states;
- constrained and expanded desktop layouts;
- light/dark visual presentation where supported by the final design.

Behavior tests remain necessary, but visual/runtime evidence must include actual packaged Electron screenshots or equivalent real-rendered views at representative constrained and expanded sizes. The orchestrator inspects that evidence directly. The Product Owner is not the screenshot QA operator.

## Next coherent outcome

Issue #373 — complete the user-owned LaTeX source model and final PLAN[4] package boundary.

No PLAN[5] implementation is authorized until #373 is implemented, independently reviewed and the master orchestrator re-evaluates the full PLAN[4] gate against authority.