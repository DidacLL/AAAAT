# M1 — Manual VCVGenerator

## Outcome

AAAAT lets the user establish a user-owned local workspace, maintain canonical career data and focused profile variants, create editable manual CV and cover-letter documents, render them locally, and export portable independent LaTeX projects.

## Required

- establish the real user-owned workspace root before storing career or document data
- keep `workspace.sqlite` and user-owned document/artifact files inside that workspace
- canonical professional profile with independently identifiable typed career items
- named profile variants that store only differences from canonical data
- explicit application services for the first genuine durable product mutations
- manual CV and cover-letter document creation from validated structured content
- document-specific selection and overrides without mutating canonical profile or selected variant
- a small reusable LaTeX package/template set using standard LaTeX and `expl3`
- pdfLaTeX compatibility baseline, with LuaLaTeX/XeLaTeX only where supported by real capability
- local document rendering
- visible source and artifact locations
- portable generated projects with no absolute dependency on AAAAT or the workspace
- preservation of direct source edits through explicit manual-document behavior
- executable LaTeX compilation and unrelated-directory portability evidence

## Explicit non-goals

- candidature tracking or recruiter-call workspace behavior (M2)
- AI providers, extraction, recommendation, tailoring, or drafting (M3)
- MCP, external agent command surfaces, provider integrations, or adaptive host setup (M4)
- generic workspace/repository abstractions
- ORM
- Redux
- plugin or workflow frameworks
- template marketplace
- installer/release expansion
- v1 compatibility or migration

## Completion

A user can select or create a real local workspace, maintain canonical career data and at least one focused variant, create and edit manual CV/cover-letter content, render locally, and move a generated LaTeX project to an unrelated directory where it remains editable and compilable without AAAAT-specific absolute paths. Independent review accepts the result without speculative later-Mission infrastructure.
