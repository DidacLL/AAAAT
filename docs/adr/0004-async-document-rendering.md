# ADR 0004 — Asynchronous document rendering and safe artifact installation

- Status: Accepted; updated by ADR 0015 and PLAN[4]
- Current baseline: pdfTeX through pdfLaTeX, invoked by `latexmk -pdf`

## Context

AAAAT renders user-owned portable LaTeX projects from the privileged Electron main process. Rendering must not block the main event loop, expose arbitrary process authority to the renderer, or leave a half-written retained artifact when TeX fails.

Earlier development versions also described in-place source replacement and a selectable document-engine enum. Those are no longer part of the current artifact model or production baseline.

## Decision

Keep one small asynchronous document-specific `latexmk` runner with a bounded timeout and process-tree termination. The command and TeX flags are fixed; user content is never interpolated into command text.

Each render creates a new artifact project in a same-filesystem staged directory. TypeScript writes the complete portable source project, `latexmk -pdf` compiles it, and only a successful project is renamed into its retained final directory and recorded in SQLite. A failed render removes incomplete staged/final directories and leaves the editable Working CV or cover letter unchanged.

Opening PDFs and selecting export destinations remain privileged main-process operations. Export copies the complete retained project; it does not move or synchronize the managed original.

No durable job queue, worker framework, engine matrix, generic rendering provider, transaction framework or recovery database is introduced.

## Consequences

- TeX execution remains asynchronous and bounded.
- Failed rendering cannot create a retained database artifact or corrupt editable document state.
- Retained artifact directories are complete installations, not in-place mutable caches.
- The production engine baseline is one pdfLaTeX path rather than a configurable engine matrix.
- Renderer/preload authority stays typed and path-free while generated source/output remains user-owned and portable.
