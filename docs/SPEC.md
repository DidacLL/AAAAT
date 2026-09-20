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

Persisted domain objects do not define the desktop interaction architecture. Welcome is first; closing it enters Focus over the application corpus. The same application area offers a dense complete-data register and one New screen for sparse raw material and/or direct field entry. Saving local information is complete work before any optional parsing or document creation. Dedicated CVs and cover letters are linked to that application. The CV area also supports standalone CV work; standalone letters remain independently available but secondary in the collection view.

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

When the user requests optional parsing or application documents while saving an application, AAAAT saves the application first, then creates the requested Working CV and/or application-owned cover letter through normal services. Validated AI routes may prepare bounded suggestions for that work. Extraction or generation failure never invalidates the retained application or editable local work.

LaTeX is an internal rendering implementation, not the ordinary document-domain model. The rendering path is conceptually:

```text
editable AAAAT document state
→ generated portable rendering project
→ internal LaTeX implementation
→ local latexmk / pdfLaTeX
→ retained PDF and immutable rendered snapshot
```

Generated portable project/output remains user-owned and exportable. The ordinary model does not require permanent per-document inclusion rules, user-authored LaTeX blueprints, raw source-path ownership, or generic document external-disclosure controls.

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

External assistants use meaningful bounded AAAAT capabilities. The carrier/host is not product meaning. The packaged MCP stdio surface is one current carrier and may be used by ChatGPT, Claude, local agents, editor hosts or other compatible environments.

The capability contract must not expose generic corpus browsing, arbitrary durable IDs as mutation handles, database queries, filesystem access, shell/process execution, package-manager authority, scraping or broad local write access. A host's wider OS authority remains the user's separate trust choice.

Meaningful parity is expressed as typed high-level product intentions, not generic CRUD. An external assistant may, for example, create the same offer-derived application document workspace as the desktop without receiving hidden application/document IDs. Setup mutations use the same application services and validation as the desktop and require explicit local authority where appropriate.

The packaged app exposes the shared bounded local tool entry point. Hosts that can start a local tool may use it without changing AAAAT's domain authority. This does not authorize a generic plugin/provider framework.

External AI environments without local-computer access use one versioned portable **application handoff**. The capsule carries only explicit opportunity text plus the requested application-document intention. File selection and JSON handling are transport details: AAAAT validates the entire capsule before mutation and then calls the same application-material service used by MCP. The Source is retained before optional AI preparation, malformed capsules do not partially mutate the workspace, and no local IDs, paths, credentials or hidden workspace state belong in the portable contract. This does not introduce a localhost service, remote relay, generic import framework or command bus.

## Setup, recovery and local ownership

The local workspace owns data, configuration, generated document projects and retained artifacts. Backup/recovery and configuration import/export remain normal product capabilities.

Setup uses one shared environment model. `installer.ai` projects workspace/local-rendering prerequisites and exposes AAAAT's fixed rendering self-test. `configurator.ai` projects optional AI configuration and validated operation coverage and can perform typed connection save/operation validation/validated default selection. These are normal AAAAT product capabilities, not copy/paste prompt artifacts.

Setup status is privacy-minimal and always readable. External mutation authority is separate and denied by default. The current workspace may explicitly allow installer and configurator actions independently; this grants only the documented typed AAAAT operations. No setup capability exposes arbitrary shell commands, package-manager input, filesystem selectors, generic database access, credentials, provider-specific arbitrary options or validation bypasses.

## Verification

Tests should cover durable user journeys, domain invariants, privacy/security boundaries, data integrity and portable artifacts. They must not freeze rejected navigation labels, clipboard-prompt semantics, host-specific product meaning or other incidental implementation structure.

Outcome tests for the raw-offer journey must prove useful persisted document state when bounded AI is available, not merely creation of empty linked records. Packaged-runtime verification must still prove the no-AI path remains complete.

Verification remains impact-selected through `.github/workflows/verify.yml`. Current execution state and evidence gaps belong in [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) and the live PR.
