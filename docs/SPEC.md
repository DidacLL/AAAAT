# AAAAT technical architecture

This document derives technical architecture from the [Product Definition](../PRODUCT_DEFINITION.md). It does not create product meaning. Current explicit Product Owner instruction and the Product Definition prevail if this document, an ADR, an Issue, a test, or existing code appears to disagree.

Use [PRODUCT_CONTEXT.md](../PRODUCT_CONTEXT.md) to interpret the product when needed, [OWNER_DEVELOPMENT_PRINCIPLES.md](../OWNER_DEVELOPMENT_PRINCIPLES.md) for development style, and [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) plus live GitHub state for active work. Historical owner material lives under [owner-source](owner-source/) and is provenance only.

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

The renderer remains sandboxed, context-isolated, and unprivileged. It receives only a narrow preload allowlist; it does not receive unrestricted filesystem, database, process, credential, or Electron authority. Durable mutations enter through normal application services, regardless of whether their input originated in the UI, an import, direct optional AI, or a bounded external integration.

The repository uses the committed Node/npm toolchain, Vite and Electron Forge for the desktop application, Zod for boundary validation, and the existing Vitest/Testing Library/Playwright evidence surfaces. These are implementation choices, not a separate product contract.

## Domain and information architecture

Keep structurally meaningful concepts explicit: candidatures, Sources, Concepts, lightweight ToDos, professional information and variants, documents and artifacts, and AI connections. Do not collapse them into generic records, arbitrary CRUD, a generic content repository, or a generic workflow model.

Normal user-facing information shares repeated behavior where real cases demonstrate it: editing, clearing/removal where domain semantics permit it, retrieval, AI disclosure control, and Focus presentation. The technical field/value representation is an implementation aid. It must not force ordinary users to manage schemas, identifiers, field types, cardinality, or database-like configuration.

Existing explicit v2 fields may adapt incrementally. Do not introduce generic EAV persistence, a new framework, or broad persistence unification without demonstrated user-facing duplication and a bounded technical reason.

Sources remain explicit retained records. Original material is not replaced by extraction or enrichment, and local source search must reach useful retained title, URL, and text. Concepts and ToDos retain their narrow domain meanings; neither becomes a generic knowledge system, scheduler, or AI-task subsystem.

## Document architecture

VCVGenerator uses canonical reusable professional information, optional difference-based variants, and deliberate document-specific overrides without cloned competing identities. Working documents remain editable. Exact material used for an application is retained separately from a mutable working document where the user needs that history.

The portable document boundary is:

```text
validated editable model
→ generated feeder data
→ editable LaTeX2e blueprint
→ expl3 implementation
→ pdfLaTeX/pdfTeX
→ user-owned source and rendered output
```

Do not silently overwrite user-authored blueprints or package sources. AAAAT-generated projects and independently authored documents must compile outside AAAAT in a compatible TeX environment. Alternate engines, a template marketplace, and a document-plugin framework are not implied.

## Optional intelligence and external integrations

AI is optional bounded processing. AAAAT owns its local domain structures, validation, mutation rules, capabilities, and process/renderer boundaries; it does not own a provider's reasoning, prompts, network, research behavior, or internal policy.

Use this operation shape:

```text
named purpose
→ deliberate bounded context
→ typed validated result
→ operation-specific mutation/conflict rule
→ normal application service
```

Privacy projection controls what a named operation discloses. It may expose, omit, or locally replace values while authoritative literals remain local. Projection is disclosure behavior, not the complete security boundary. Do not expose generic corpus browsing, arbitrary durable IDs, arbitrary filesystem/shell/process access, generic query/CRUD surfaces, scraping, or broad local write access for convenience.

External AI and hosts may use named product operations through a demonstrated transport such as MCP, a command, a skill, plugin, or another bounded mechanism. The transport is not product meaning and does not justify a provider marketplace, AI orchestration framework, general API platform, prompt-injection middleware, AI firewall, or universal approval queue.

## Setup, recovery, and local ownership

The local workspace owns data, configuration, document source, and artifacts. Backup/recovery and configuration import/export remain normal product capabilities. Setup describes actual host access honestly and supports no-AI, local, remote, and free-chat guidance paths without requiring ordinary users to understand implementation protocols.

Development databases, fixtures, and fake workspaces are not compatibility commitments. Until an explicit Product Owner decision establishes a real-use baseline for actual user data, obsolete development-era schema may be corrected directly when required. The dormant baseline evidence record is technical history, not an active release or compatibility programme.

## Technical destinations

Implement capabilities through small coherent slices that make the product more useful:

| Technical destination | Required technical outcome |
| --- | --- |
| Reliable local information and retrieval | Raw Sources, sparse information, editing, search, Focus projections, and draft protection work through normal local domain services. |
| Context and operation boundaries | Wire contracts remain distinct from local state; context is deliberate and bounded; invalid or conflicting results cannot silently corrupt authoritative edits. |
| Reusable documents | Independent document work, candidature-associated application material, portable source/output, and local rendering preserve user ownership. |
| Accessible setup and recovery | Capabilities are described honestly; working software can be detected/reused; configuration and workspace recovery remain usable through normal product access. |

These destinations are derived outcomes, not a prescribed user journey, Issue sequence, or pre-created backlog.

## ADRs, evidence, and verification

Accepted ADRs record technical decisions within already-established product meaning. They may refine architecture and preserve evidence, but they cannot establish new product requirements. Historical Issue, milestone, or programme names are evidence only; do not revive a rejected workflow because it appears in an ADR or test.

Tests demonstrate user-visible behavior, domain invariants, security/privacy/local-ownership boundaries, data integrity, and portable artifacts. They must not freeze incidental implementation mechanisms unless a concrete correctness boundary requires it.

Verification is impact-selected. A successful check remains reusable when later changes cannot affect its behavior, platform path, fixture contract, environment assumption, or other premise. Follow `.github/workflows/verify.yml`; do not replay unrelated package, runtime, visual, or TeX evidence merely because documentation or another non-intersecting path changed.

Current execution state, unresolved findings, active work, and evidence gaps belong in [CURRENT_MISSION.md](../.agentic/CURRENT_MISSION.md) and the linked live GitHub work item, not in this architecture document.
