# AAAAT desktop UX definition

This document describes the current desktop interaction contract. Explicit Product Owner instruction outranks it. Persisted entities, existing components, tests and historical mockups are not design authority.

## 1. The shell is intention-first

The useful desktop surface starts from what the user is trying to do:

- **From a job offer** — paste raw offer/source material and create a tailored CV, a cover letter, or both without first administering an application record.
- **CV & cover letter** — standalone document work when there is no opportunity context or the document itself is the task.
- **Saved applications** — recognize and recall retained opportunity/application context.
- **My information** — read and maintain reusable professional/career information.
- **Settings** — secondary ownership, recovery, rendering, optional AI and bounded external-assistant configuration.

Internal names such as candidature, field definition, rule, variant, artifact, source path or host manifest must not become required navigation concepts merely because they exist in persistence.

## 2. Raw offer → documents is a direct journey

The ordinary path is:

> I found a job → paste the raw offer → choose CV, cover letter or both → work on useful documents.

The pasted offer is the dominant first-sight object. AAAAT retains it as a Source and may automatically create/link the underlying application context and documents. The user is not asked to create, name, remember, relocate or manually link a candidature before reaching document work.

When the required AI routes are already validated, choosing **Tailored CV** and/or **Cover letter** is itself the user authorization to start the relevant bounded preparation. AAAAT starts that slow work automatically from the retained offer and reusable professional information, keeps it non-blocking, shows progress in the document, and persists the resulting tailored CV state and/or letter draft. The user is not required to discover a second AI button for the same intention.

One malformed extraction proposal cannot invalidate otherwise useful preparation. If AI is unavailable, incompatible or cannot derive safe opportunity facts, the Source and document projects remain intact and directly editable. Manual/local use is a complete path.

After document work begins, the retained offer/application context remains reachable for inspection without turning the handoff into a navigation puzzle.

## 3. Standalone document work is independently core

A user can create and edit a CV or cover letter without a candidature and without AI.

The normal document surface emphasizes:

- the document being produced;
- its actual editable content;
- the professional information actually relevant/included in it;
- its current rendered/exportable result.

For CVs, effective included evidence dominates first sight. For cover letters, the letter text dominates first sight. Saved variations, ordering rules, per-document overrides, source/LaTeX ownership, paths and external-assistant disclosure remain available when useful, but are progressively disclosed. Large generic administration forms and unused professional fields must not dominate ordinary document work.

## 4. Saved applications is recall, not prerequisite filing

Saved applications contains the retained opportunity/application contexts created manually or automatically. Corpus view is for recognition and retrieval; selected view is for useful context. Complete maintenance is available deliberately one level deeper.

Sources are first-class and raw material remains readable. Flexible application information and Tags remain user-maintainable. Ordinary value editing presents information, not schema terminology. Field-definition machinery is secondary.

The product does not require formal lifecycle/status/priority/next-action architecture to make an application valid.

## 5. My information is read-first

Normal first sight shows actual experience, education, projects, skills, languages, links, summaries and preferences. Editing happens in context.

Saved variations, AI disclosure and secondary metadata are not permanent administration chrome. Local storage, presentation/Focus behavior and AI disclosure remain independent semantics.

## 6. Settings is secondary and host-agnostic

Settings groups user intentions such as workspace/recovery, document rendering, optional AI connections and external-assistant/portable setup.

VS Code is an optional advanced adapter only. Product copy must not imply AAAAT is a VS Code extension or that VS Code is the preferred host.

Compatible external assistants may include ChatGPT, Claude, local agents, editor hosts or other user-selected environments. AAAAT exposes bounded capabilities, never generic database/filesystem/shell/process authority.

`installer.ai` and `configurator.ai` are live shared setup capabilities used by AAAAT and compatible external assistants. They are not copyable free-chat prompt documents and are not merely status cards. Status is privacy-minimal and readable; external mutations are denied by default until the user locally enables installer/configurator actions independently. Enabled actions remain typed AAAAT intentions such as the fixed rendering self-test or AI connection save/validation/default selection, never arbitrary shell/package-manager/filesystem authority.

The external surface should express meaningful user intentions available in the desktop, such as creating application documents from one job offer, rather than expose generic CRUD or hidden durable IDs.

## 7. Progressive disclosure

For every visible control ask whether it is needed for the task now. If it exists primarily because there is a table/service/configuration object underneath, move it deeper unless the user intention genuinely requires it.

Examples that belong behind deliberate disclosure when not immediately relevant:

- field-definition type/cardinality controls;
- saved variants and variant rules;
- per-document title/description overrides;
- source paths, TeX source ownership and regeneration controls;
- AI privacy/diagnostic detail;
- host-specific adapter setup;
- technical environment/version detail.

Progressive disclosure must preserve ownership; it must not delete advanced capability merely to simplify first sight.

## 8. Spatial behavior

One principal task owns the useful viewport. Use available desktop width/height rather than placing a narrow generic form in a large empty canvas.

At constrained sizes, layouts may stack and scroll. At larger sizes, offer text, document content, relevant information and recall context should use the space productively. Branding and explanation text must not displace the task.

Empty states are composed around a useful next action rather than appearing as accidental blank space.

## 9. Visual character

AAAAT is a worn-retrofuturist field terminal / paper dossier / workshop instrument, not generic SaaS minimalism.

Use warm paper surfaces for retained/readable information, stronger machine/panel framing for navigation and controls, restrained borders/stamps/labels and compact professional density. Visual character should reinforce ownership and task hierarchy, not add decorative clutter.

## 10. Verification

Natural-use acceptance asks whether ordinary intentions are discoverable and frictionless without instructions. Tests should protect durable journeys and boundaries rather than exact incidental wording/CSS.

Required evidence includes at least:

- first-run workspace/demo access remains usable;
- a pasted offer can create CV/cover-letter work without prior candidature administration;
- with validated AI available, that same journey persists useful tailored/generated document state instead of merely empty linked records;
- without AI, the same journey remains complete and directly editable;
- standalone CV/cover-letter work remains directly reachable;
- retained applications and My information remain reachable/readable;
- unsaved work is protected;
- Settings presents host-agnostic bounded assistant access and keeps VS Code optional;
- setup capabilities are live state/actions, not clipboard prompt templates, and external mutations remain explicitly user-controlled;
- packaged desktop behavior remains coherent at constrained and normal desktop sizes.
