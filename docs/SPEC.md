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

Persisted domain objects do not define the desktop interaction architecture. The shell is composed around user intentions and may create/link domain objects automatically. In particular, the raw-offer-to-document journey may retain a Source, create an application context and link document projects without surfacing those intermediate objects as required steps.

## Domain and information architecture

Keep structurally meaningful domain objects explicit underneath the UI: candidatures/application contexts, Sources, Tags, professional information and variants, documents/artifacts, optional AI connections and bounded secondary data. Do not collapse them into generic records, arbitrary CRUD, a generic content repository or a workflow framework.

Ordinary value entry must not force users to think in schemas, identifiers, field types, cardinality or database-like configuration. Flexible application information remains user-maintainable product data, but definition controls are progressively disclosed.

Sources remain explicit retained records. Original material is not replaced by extraction/enrichment. Tags keep their narrow glossary/retrieval role.

## Document architecture

VCVGenerator uses canonical reusable professional information, optional difference-based variants and deliberate document-specific overrides without cloned competing identities. Standalone document work and opportunity-context document work use the same document foundation.

The normal document surface is about the document being produced and information relevant to it. For a CV, effective included evidence is primary. For a cover letter, the editable letter text is primary. Variants, per-document overrides, ordering, LaTeX/source ownership and external disclosure remain available, but they are secondary controls rather than the creation mental model.

When the user starts application documents from a raw offer and validated AI routes already exist, the renderer may start one bounded non-blocking preparation task automatically. That task reuses the existing robust job-extraction and document-AI operations sequentially, applies only independently valid existing-field proposals, then persists the resulting CV inclusion/order rules and/or cover-letter fields through normal document services. Failure or absence of AI never invalidates the retained Source or the created editable documents.

The portable boundary is:

```text
validated editable model
→ generated feeder data
→ editable LaTeX2e blueprint
→ expl3 implementation
→ pdfLaTeX/pdfTeX
→ user-owned source and rendered output
```

Do not silently overwrite user-authored blueprints or package sources.

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

Meaningful parity is expressed as typed high-level product intentions, not generic CRUD. An external assistant may, for example, create the same offer-derived application document workspace as the desktop without receiving the hidden candidature/document IDs. Setup mutations use the same application services and validation as the desktop and require explicit local authority where appropriate.

VS Code is one optional adapter over the shared contract. It must not define the architecture or product navigation. Additional concrete adapters require demonstrated value; this does not authorize a generic plugin/provider framework.

## Setup, recovery and local ownership

The local workspace owns data, configuration, document source and artifacts. Backup/recovery and configuration import/export remain normal product capabilities.

Setup uses one shared environment model. `installer.ai` projects workspace/local-rendering prerequisites and exposes AAAAT's fixed rendering self-test. `configurator.ai` projects optional AI configuration and validated operation coverage and can perform typed connection save/operation validation/validated default selection. These are normal AAAAT product capabilities, not copy/paste prompt artifacts.

Setup status is privacy-minimal and always readable. External mutation authority is separate and denied by default. The current workspace may explicitly allow installer and configurator actions independently; this grants only the documented typed AAAAT operations. No setup capability exposes arbitrary shell commands, package-manager input, filesystem selectors, generic database access, credentials, provider-specific arbitrary options or validation bypasses.

## Verification

Tests should cover durable user journeys, domain invariants, privacy/security boundaries, data integrity and portable artifacts. They must not freeze rejected navigation labels, clipboard-prompt semantics, host-specific product meaning or other incidental implementation structure.

Outcome tests for the raw-offer journey must prove useful persisted document state when bounded AI is available, not merely creation of empty linked document records. Packaged-runtime verification must still prove the no-AI path remains complete.

Verification remains impact-selected through `.github/workflows/verify.yml`. Current execution state and evidence gaps belong in [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) and the live PR.
