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

Persisted domain objects do not define the desktop interaction architecture. Welcome is first; after a workspace is opened, one configurable Applications surface covers the candidature corpus and selected-candidature detail rather than exposing historical peer Focus / All data product areas. New application accepts sparse raw material and/or direct information entry. Saving local information is complete work before any optional parsing or document creation. Dedicated CVs and cover letters are linked to that application. The CV area also supports standalone CV work; standalone letters remain independently available but secondary in the collection view.

## Domain and information architecture

Keep structurally meaningful domain objects explicit underneath the UI: application contexts, Sources, shared Tags, reusable professional information and item-level variants, CV templates, Working CVs, Rendered CVs, cover letters, Application packets, optional AI connections and bounded secondary configuration. Do not collapse them into generic records, arbitrary CRUD, a generic content repository or a workflow framework.

Ordinary value entry must not force users to think in schemas, identifiers, field types, cardinality or database-like configuration. Flexible application information remains user-maintainable product data, but definition controls are progressively disclosed.

Sources remain explicit retained records. Original material is not replaced by extraction/enrichment. Tags keep their narrow shared-glossary/retrieval role.

## Document architecture

The current document domain has explicit roles rather than one generic document/rule model:

- **My information** stores reusable professional facts and narrative items.
- A **Profile variant** is alternate wording or emphasis for one reusable information item. It is not a whole-profile snapshot or aggregate difference set.
- A **CV template** is a reusable ordered composition of sections and items. Template items may reference current My information, a saved item variant, a template-local override, or custom content.
- A **Working CV** is an editable CV composition derived from a template, an application context, My information, or a blank start. Editing a Working CV does not implicitly rewrite its reusable sources; explicit save-back actions own that choice.
- A **Rendered CV** retains the generated PDF together with an immutable content/composition snapshot. Editing resumes by creating or duplicating editable Working CV state rather than mutating the rendered snapshot.
- A **cover letter** is a separate editable document, normally owned by an application, with standalone creation also supported.
- An **Application packet** is generated application output combining the selected application CV and cover letter.

When the user requests application documents while saving an application, AAAAT saves the application first, then creates the requested Working CV and/or application-owned cover letter through normal services. Document creation by itself is deterministic and local. AI parsing/preparation runs only after a separate explicit AI opt-in in the existing product surface; merely having a validated route never authorizes disclosure or AI mutation. AI failure never invalidates retained application or editable local work.

LaTeX is an internal rendering implementation, not the ordinary document-domain model. The current implementation proves this provisional production boundary:

```text
typed Working CV / cover-letter state
→ TypeScript document data feeder
→ current AAAAT LaTeX source/package facade
→ self-contained project
→ latexmk -pdf / pdfLaTeX
→ retained PDF and immutable generated artifact
```

`src/main/document-latex.ts` is the current document-text encoding and data-feeding boundary. It emits through the small facade in `src/main/latex/aaaat.sty`; CV and letter presentation currently lives in `src/main/latex/cv.tex` and `src/main/latex/cover-letter.tex`. Application packets keep their own small entrypoint and combine exact retained contributor outputs rather than becoming an editable third document type.

That implementation is retained rendering infrastructure, not the completed PLAN[4] document-package design. ADR 0015 remains accepted technical authority: the intended package uses a LaTeX2e public API with expl3 internals, while editable blueprints and modified package sources remain user-owned. Detailed blueprint, language and font design remains an owner-collaboration boundary.

A Rendered CV stores its immutable Working CV composition snapshot. A rendered cover letter stores an immutable cover-letter snapshot without introducing a generic rendered-document abstraction. Application packets retain the cover-letter snapshot used for the packet and the selected Rendered CV. Rendering is staged and a database artifact record is created only after successful compilation.

Every managed or exported source project contains the AAAAT-owned package/template/data files it needs and uses only project-relative references. Export copies the complete retained project to a user-selected location without moving or mutating the managed original. The renderer receives typed artifact records and privileged open/export intentions, never arbitrary internal source paths.

Generated portable project/output remains user-owned and exportable. Ordinary document editing does not need to expose raw source paths, generic render-provider concepts or generic external-disclosure controls. Separately, ADR 0015 preserves editable blueprints and modified package sources as user-owned document assets; their final product interaction is unresolved PLAN[4] work rather than a rejected requirement.

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

The packaged MCP stdio surface and the portable application-handoff file are **currently implemented carriers**. They prove bounded local mutation and transport mechanics; they are not, by themselves, accepted evidence of PLAN[2]'s required journeys beginning in real third-party AI environments.

The capability contract must not expose generic corpus browsing, arbitrary durable IDs as mutation handles, database queries, filesystem access, shell/process execution, package-manager authority, scraping or broad local write access. A host's wider OS authority remains the user's separate trust choice.

Meaningful parity is expressed as typed high-level product intentions, not generic CRUD. A real external-AI-first journey may need to return analysed/proposed candidature information, retained research Sources, document contributions, selection/tailoring intent or another bounded useful result already produced by that external AI. The contract should carry the minimum useful result for the chosen journey without exposing hidden local IDs or broad workspace authority.

The packaged app may expose a bounded local tool entry point for hosts that can start local tools. Whether MCP, host-native configuration, browser/desktop assistance, a user-owned rendezvous mechanism or another carrier is appropriate is decided from a representative real environment and journey, not from the carrier already implemented. This does not authorize a generic plugin/provider framework.

The current versioned **application handoff** for environments without local-computer access is a limited fallback/scaffold: it validates explicit opportunity text plus requested document-output kinds before local mutation. Its safety properties remain useful, but that narrow payload is not accepted as the complete no-local-access product journey. A recovered PLAN[2] journey may extend, replace or complement it so the external AI's useful completed work can cross the boundary.

## Setup, recovery and local ownership

The local workspace owns data, configuration, generated document projects and retained artifacts. Backup/recovery and configuration import/export remain normal product capabilities.

Setup uses one shared environment model. The current `installer.ai` implementation projects workspace/local-rendering prerequisites and exposes a fixed rendering self-test. The current `configurator.ai` implementation projects optional AI configuration and validated operation coverage and can perform typed connection save/operation validation/validated default selection. Rejecting copy/paste prompts as the primary UX remains valid, but these current typed/status surfaces are only partial setup implementation until representative user environments demonstrate product-level detection/guidance/connection where justified.

Setup status is privacy-minimal and always readable. External mutation authority is separate and denied by default. The current workspace may explicitly allow installer and configurator actions independently; this grants only the documented typed AAAAT operations. No setup capability exposes arbitrary shell commands, package-manager input, filesystem selectors, generic database access, credentials, provider-specific arbitrary options or validation bypasses. Raw executable arguments or protocol vocabulary are implementation detail and are not sufficient ordinary-user setup by themselves.

## Verification

Tests should cover durable user journeys, domain invariants, privacy/security boundaries, data integrity and portable artifacts. They must not freeze rejected navigation labels, clipboard-prompt semantics, host-specific product meaning or other incidental implementation structure.

Evidence is scoped to the boundary actually exercised: AAAAT's own MCP SDK client proves its MCP server, not a third-party-host journey; mocked OpenAI-compatible HTTP proves provider-contract handling, not useful behavior from an actual constrained model; real pdfLaTeX compilation proves rendering/portability mechanics, not the unresolved owner-approved document-package design.

Outcome tests for the raw-offer journey must prove useful persisted document state when bounded AI is available, not merely creation of empty linked records. Packaged-runtime verification must still prove the no-AI path remains complete.

Verification remains impact-selected through `.github/workflows/verify.yml`. Current execution state and evidence gaps belong in [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) and the live PR.
