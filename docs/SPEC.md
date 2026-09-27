# AAAAT technical architecture

This document derives technical architecture from the [Product Definition](../PRODUCT_DEFINITION.md). It does not create product meaning. Current explicit Product Owner instruction and the Product Definition prevail if this document, an ADR, an Issue, a test, or existing code appears to disagree.

Use [PRODUCT_CONTEXT.md](../PRODUCT_CONTEXT.md) for rationale, [OWNER_DEVELOPMENT_PRINCIPLES.md](../OWNER_DEVELOPMENT_PRINCIPLES.md) for development style, and [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) plus live GitHub state for active work.

## Architectural baseline

AAAAT is one local desktop application:

```text
Electron + React + strict TypeScript
        ↓
typed, sandboxed preload boundary
        ↓
application services
        ↓
SQLite workspace and user-owned files
```

The renderer remains sandboxed, context-isolated and unprivileged. Durable mutations enter through normal application services whether their input originated in the UI, an import, direct optional AI, or a bounded external integration.

Persisted domain objects do not define the desktop interaction architecture. Welcome is first; after a workspace is opened, one configurable Applications surface covers the candidature corpus and selected-candidature detail rather than exposing historical peer Focus / All data product areas. `New application` has the two direct Product Definition intentions: deliberate structured information entry, or raw-material retention. Raw retention is already complete work; after it succeeds, the same post-retention surface exposes explicit peer continuations to send the retained Source to configured AI or fill the candidature manually with Source and fields readily available together. Dedicated CVs and cover letters are linked to that application when deliberately requested. The CV area also supports standalone CV work; standalone letters remain independently available but secondary in the collection view.

## Domain and information architecture

Keep structurally meaningful domain objects explicit underneath the UI: application contexts, Sources, shared Tags, reusable professional information and item-level variants, CV templates, Working CVs, Rendered CVs, cover letters, Application packets, optional AI connections and bounded secondary configuration. Do not collapse them into generic records, arbitrary CRUD, a generic content repository or a workflow framework.

Ordinary value entry must not force users to think in schemas, identifiers, field types, cardinality or database-like configuration. Flexible application information remains user-maintainable product data, but definition controls are progressively disclosed.

Sources remain explicit retained records. Original material is not replaced by extraction/enrichment. Tags keep their narrow shared-glossary/retrieval role.

## Renderer and visible-UX architecture

The renderer is composed from user intentions, not service/table boundaries. Existing React components are implementation material, not interaction authority.

For every visible-UI change, establish product meaning from Product Definition/current Product Owner instruction and then use `docs/UX_DEFINITION.md` plus `docs/UX_VISUAL_DIRECTION.md`. The visual-direction document is mandatory visible-UI guidance: machine/control framing should express AAAAT's friendly worn retrofuturist field-terminal/workshop character while content-heavy surfaces remain clear paper/dossier-like information. Generic SaaS card/form styling, generic developer dashboards, aggressive cyberpunk effects and decoration that reduces readability are not acceptable substitutes merely because behavior tests pass.

Historical paired dark/light logo, banner, background and loading assets under `docs/owner-source/` are visual research inputs and should be inspected directly when implementing shell/Home/onboarding/theme presentation. They do not mandate copying a historical mockup or creating a generalized design-system/theme framework.

At constrained desktop sizes the current intention owns the useful viewport. Prefer state transition, reflow and vertical reachability to clipping or permanent multi-pane compression. At expanded sizes, use space productively rather than centering narrow forms in unused canvas. Empty and sparse states require intentional composition and a useful next action, not merely an empty container.

Loaded Home is a branded **landing console**. It combines AAAAT identity with concise useful operational shorthand. Once a workspace is loaded, Home is not a workspace-entry launcher: create/open/demo/switch controls do not occupy the landing body. Workspace switching/creation belongs in a compact shell/workspace interaction or Settings. Home also must not become a generic metrics-dashboard framework or merely duplicate persistent rail badges.

PLAN[5] remains blocked until PLAN[4] is accepted. Merged renderer slices may be reused only where they satisfy the eventual coherent interaction/visual design. Issue #314's still-open owner-acceptance correction remains blocking where it agrees with current Product Definition.

## Document architecture

The document domain has explicit roles rather than one generic document/rule model:

- **My information** stores reusable professional facts and narrative items.
- A **Profile variant** is alternate wording or emphasis for one reusable information item. It is not a whole-profile snapshot or aggregate difference set.
- A **CV template** is a reusable ordered composition of sections and items. Template items may reference current My information, a saved item variant, a template-local override, or custom content. Each section also carries Blueprint-independent semantic presentation role `main` or `secondary`.
- A **Working CV** is an editable CV composition derived from a template, an application context, My information, or a blank start. Editing a Working CV does not implicitly rewrite its reusable sources; explicit save-back actions own that choice. Section presentation roles are editable composition state and are not concrete layout geometry.
- A **Rendered CV** retains the generated PDF together with an immutable content/composition snapshot. Editing resumes by creating or duplicating editable Working CV state rather than mutating the rendered snapshot.
- A **cover letter** is a separate editable document, normally owned by an application, with standalone creation also supported.
- An **Application packet** is generated application output combining the selected Rendered CV and application cover letter.

When the user deliberately requests application documents, AAAAT saves authoritative application/Source information first and then creates the requested Working CV and/or application-owned cover letter through normal services. Document creation by itself is deterministic and local. Optional AI parsing/preparation is a separate bounded action and never makes local retention contingent on inference. AI failure never invalidates retained application or editable local work.

LaTeX is an internal rendering implementation, not the ordinary document-domain model. The current PLAN[4] candidate boundary is:

```text
typed Working CV / cover-letter state
→ TypeScript-generated data.tex
→ user-owned shared aaaat.sty (LaTeX2e public API / expl3 internals)
→ selected user-owned/shipped Blueprint presentation source
→ self-contained retained project
→ latexmk -pdf / pdfLaTeX
→ retained PDF and immutable generated artifact
```

`src/main/document-latex.ts` owns document-text encoding and generated `data.tex`. It feeds document kind, language, title/content and CV section semantic roles through the public facade in `aaaat.sty`. TypeScript does not decide main/secondary geometry.

A Blueprint is a complete compatible pdfLaTeX presentation program. AAAAT ships `src/main/latex/default-blueprint.tex` as the current first design decision and discovers advanced-user compatible `.tex` Blueprints from application configuration under Electron `userData/blueprints`. Blueprint selection is an explicit render-time input and is not persisted as ownership on CV Templates, Working CVs or cover letters.

The shipped Blueprint covers both CV and cover-letter presentation. For CVs it maps `secondary` sections to its narrow region and `main` sections to its wide region while preserving source order inside each role. Another compatible Blueprint may interpret `secondary` differently without changing the CV composition. The previous count/order-based automatic rail split is not part of the contract.

ADR 0015 also requires **modified package sources to remain user-owned**. Export-only editability is not sufficient to erase that requirement. The final PLAN[4] model therefore uses one application-level user-owned editable shared package source, seeded from the shipped default when absent and not silently overwritten once the user owns it. There is still one shared package/library rather than package ownership per Blueprint. The exact configuration directory and typed open-folder intention are implementation details of Issue #373; the renderer must not receive arbitrary filesystem authority.

Every retained document project must contain a generic `main.tex`, the exact selected `blueprint.tex`, generated `data.tex`, the exact shared `aaaat.sty` source actually consumed by that render, and resulting build/PDF output. Application packets retain the selected Rendered CV project unchanged and render their cover letter with the exact Blueprint/package source boundary associated with that retained design, rather than rediscovering or persisting presentation ownership on editable documents.

Document language remains document data. The current supported rendering boundary is pdfLaTeX + Babel for the bounded Latin-script set English, Catalan, German, Spanish, French, Italian and Portuguese. Supported natural names, primary language codes and region variants resolve to the corresponding Babel language; an unspecified language keeps the English baseline. Unsupported/non-Latin language values fail clearly rather than silently rendering as English. Fonts remain Blueprint-owned; there is no separate font/theme abstraction or LuaLaTeX/XeLaTeX engine matrix.

ADR 0015 remains accepted technical authority for the LaTeX2e/expl3/pdfLaTeX boundary and user source ownership. Issues #344, #351 and #355 implemented substantial portions of that boundary, but their closure is slice history rather than proof that PLAN[4] is complete. Issue #373 owns the remaining coherent package-source completion and final full-boundary revalidation.

A Rendered CV stores its immutable Working CV composition snapshot, including semantic section roles. A rendered cover letter stores an immutable cover-letter snapshot without introducing a generic rendered-document abstraction. Application packets retain the cover-letter snapshot used for the packet and the selected Rendered CV. Rendering is staged and a database artifact record is created only after successful compilation.

Every managed or exported source project contains the package/Blueprint/data files it needs and uses only project-relative references. Export copies the complete retained project to a user-selected location without moving or mutating the managed original. The renderer receives typed artifact records and privileged open/export/configuration-folder intentions, never arbitrary internal source paths.

Generated portable project/output remains user-owned and exportable. Ordinary document editing does not expose raw source paths, generic render-provider concepts, Blueprint geometry, or generic external-disclosure controls. Advanced source ownership is explicit but stays outside the normal content editor; AAAAT does not provide an in-app LaTeX editor.

## Optional intelligence and external assistants

AI is optional bounded processing. AAAAT owns local domain structures, validation, mutation rules, capabilities and process/renderer boundaries; it does not own a provider's reasoning or internal policy.

Use this operation shape:

```text
named purpose
→ deliberate bounded context
→ typed validated result
→ operation-specific mutation/conflict rule
→ normal application service
```

External assistants use meaningful bounded AAAAT capabilities. The carrier/host is not product meaning.

The packaged MCP stdio surface and portable handoff/file carriers are implementation mechanisms, not product authority. Product acceptance depends on the concrete bounded journey and retained result rather than the carrier itself.

The capability contract must not expose generic corpus browsing, arbitrary durable IDs as mutation handles, database queries, filesystem access, shell/process execution, package-manager authority, scraping or broad local write access. A host's wider OS authority remains the user's separate trust choice.

Meaningful parity is expressed as typed high-level product intentions, not generic CRUD. A real external-AI-first journey may return analysed/proposed candidature information, retained research Sources, document contributions, selection/tailoring intent or another bounded useful result already produced by that external AI. The contract should carry the minimum useful result for the chosen journey without exposing hidden local IDs or broad workspace authority.

The packaged app may expose a bounded local tool entry point for hosts that can start local tools. Whether MCP, host-native configuration, browser/desktop assistance, a user-owned rendezvous mechanism or another carrier is appropriate is decided from a representative real environment and journey, not from the carrier already implemented. This does not authorize a generic plugin/provider framework.

The older versioned **application handoff** remains a limited mechanism distinct from the accepted `Send to my AI` interaction. Preserve useful safety properties without treating the historical payload shape as product authority.

## Setup, recovery and local ownership

The local workspace owns data, configuration, generated document projects and retained artifacts. Backup/recovery and configuration import/export remain normal product capabilities.

Setup uses one shared environment model. The current `installer.ai` implementation projects workspace/local-rendering prerequisites and exposes a fixed rendering self-test. The current `configurator.ai` implementation projects optional AI configuration and validated operation coverage and can perform typed connection save/operation validation/validated default selection. Rejecting copy/paste prompts as the primary setup UX remains valid, but these current typed/status surfaces are only partial setup implementation until representative user environments demonstrate product-level detection/guidance/connection where justified.

Setup status is privacy-minimal and always readable. External mutation authority is separate and denied by default. The current workspace may explicitly allow installer and configurator actions independently; this grants only the documented typed AAAAT operations. No setup capability exposes arbitrary shell commands, package-manager input, filesystem selectors, generic database access, credentials, provider-specific arbitrary options or validation bypasses. Raw executable arguments or protocol vocabulary are implementation detail and are not sufficient ordinary-user setup by themselves.

## Verification

Tests should cover durable user journeys, domain invariants, privacy/security boundaries, data integrity and portable artifacts. They must not freeze rejected navigation labels, clipboard-prompt semantics, host-specific product meaning or other incidental implementation structure.

Evidence is scoped to the boundary actually exercised: AAAAT's own MCP SDK client proves its MCP server, not a third-party-host journey; mocked OpenAI-compatible HTTP proves provider-contract handling, not useful behavior from an actual constrained model. Real pdfLaTeX compilation proves rendering/portability mechanics; it does not by itself prove the complete PLAN[4] source-ownership/design boundary. PRs #348/#353/#358 provide strong reusable evidence for unaffected TeX, Blueprint, section-role, language and packaged-runtime premises, while Issue #373 must prove the final user-owned shared package source is actually consumed and exactly retained before the PLAN gate can be judged.

Outcome tests for the raw-offer journey must prove useful persisted state and the Product Definition's explicit post-retention manual/AI choices rather than merely creation of empty linked records. Packaged-runtime verification must still prove the no-AI path remains complete.

Visible UX/UI acceptance additionally requires real rendered application evidence, not component tests alone. At the eventual PLAN[5] boundary, inspect representative packaged views across first run, loaded Home/shell, Applications including both creation approaches, My information, Documents, Tags and Settings; constrained and expanded sizes; empty/sparse states; and the final supported light/dark visual presentation. The master orchestrator performs that audit; Product Owner manual screenshot QA is not a substitute.

Verification remains impact-selected through `.github/workflows/verify.yml`. Current execution state and evidence gaps belong in [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) and the live PR.
