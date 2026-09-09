# ADR 0024 — External CV rendering requires separate local production authority

**Status:** Accepted for Issue #200

## Context

`PRODUCT_DEFINITION.md` permits bounded external-AI contributions and user-owned local production. This ADR records the technical boundary for named AAAAT operations and supported local production actions; it does not define product meaning. Existing `candidature_create` already demonstrates one bounded external mutation through the ordinary candidature service. After ADR 0023, an external assistant may also read the effective content of one locally selected CV.

SPEC states that receiving permitted information does not authorize changing it. A CV being readable therefore cannot silently authorize an external host to trigger production work. Rendering is a bounded supported local action, but it writes the working document's normal generated output and must remain under explicit user authority.

AAAAT has no real-user v2 compatibility baseline. The current document schema is development-era state rather than a released migration commitment.

## Decision

Add one explicit `ai_render_allowed` boolean to working documents. It is meaningful only for CVs and may be true only when the same row is also the one `ai_content_visible` CV. Database checks enforce this dependency; the existing single-content-selection invariant ensures there can be at most one externally render-authorized CV.

Content and production authority remain separate:

- enabling CV content access never enables render authority;
- render authority can be enabled only after content access is active for that CV;
- revoking or replacing content access atomically clears any render authority on the prior CV;
- cover letters cannot hold either external CV content or render authority.

The bounded CV access application service owns both transitions. A distinct desktop `updateRender` intention prevents the renderer from treating the two permissions as one generic policy object. Real permission transitions record ordinary document activity; repeated no-op writes do not.

The Documents UI presents render authorization only on CVs, separately from content disclosure, and asks for explicit confirmation before enabling it. Structured unsaved edits continue to disable external permission changes so the user does not confuse unsaved renderer state with the persisted document that an external action would affect.

Add one zero-input MCP operation, `cv_render`. It does not accept document IDs, titles, response-local `CV n` labels, tags, queries, paths, engines, commands, output paths or other render controls. If no currently content-selected CV also has render authorization, it returns `null` and performs no production action. Otherwise it delegates to the existing `renderDocument` application service for that CV and returns only `{ rendered: true }`.

The external adapter does not implement rendering itself and receives no generic filesystem/process authority. Existing managed/manual source ownership, render conflict behavior, TeX invocation boundaries, artifact paths and document activity remain owned by the normal document service. The acknowledgement never exposes document identity, source/PDF paths, TeX/PDF bytes, process output, command details or local environment information.

The demonstrated VS Code MCP setup expands to the exact five-tool surface and retains live tool-name/cardinality verification before host configuration is written.

Correct development-era `003_documents.sql` directly to add the render flag and invariants. Do not add a compatibility migration or schema adapter solely for pre-use development databases.

## Consequences

- A configured external host can request one useful local production action without receiving generic document-selection or render-control authority.
- Read permission and action permission remain independent and understandable.
- Rendering converges on the same service and source-ownership behavior as manual desktop use.
- Revoking the broader CV-content disclosure automatically removes dependent render authority.
- No generic permission engine, action registry, task queue, workflow framework, shell bridge, filesystem API or external document reference is introduced.

This decision does not authorize external cover-letter rendering, arbitrary document rendering, output-path selection, engine/command selection, generic production APIs, automatic sharing, background job infrastructure, provider/research expansion, compatibility machinery, or additional dependencies.
