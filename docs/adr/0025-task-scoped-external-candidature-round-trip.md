# ADR 0025 — Task-scoped external candidature round trip

- Status: Accepted
- Date: 2026-09-10
- Decision class: C
- Issue: #253

## Context

ADR 0014 establishes that external integrations expose bounded purpose-specific AAAAT operations rather than generic CRUD, browsing, query or data-scraping authority, and that privacy projection is a separate concern.

AAAAT already lets an external host create one Source-backed candidature and work with deliberately exposed CV material. It does not yet let a user work on one existing candidature in a preferred external AI UI and retain the useful result without copy/re-entry.

The Product Owner clarified that data minimization is **task-scoped**, not a universal fixed-field allowlist. Organisation, role and location are examples of information a company/opportunity task might need, not a permanent definition of every external task. A later fit or document task may legitimately require different data. Future user-defined tasks may also be useful, but they must still compile to bounded formatted operations instead of opening the local data model.

## Decision

Issue #253 adds one concrete external task round trip for one locally selected candidature.

The local selection is durable, off by default, exclusive to this task, and limited to one active candidature. The external caller cannot choose a candidature or pass local identifiers. Archiving the selected candidature revokes the task selection.

`opportunity_research_context_read` accepts no selector and returns only a formatted projection of the selected candidature's retained information permitted by the existing AI-context privacy settings. `omit` data stays local, `token` data leaves only as operation-local placeholders, and exposed choice values use user-facing labels rather than durable choice IDs. The operation does not expose Sources, other candidatures, professional information, Career preferences, documents, Concepts, ToDos, activity/history, local paths or generic corpus metadata.

The task projection is intentionally not a hard-coded three-field product rule. A task owns the shape and amount of context justified by that task. Different future tasks may define different typed projections, including selected professional information when their purpose requires it. Permission or context for one task does not implicitly authorize another task.

`candidature_source_add` accepts only validated Source material and writes it through the normal candidature Source service to the candidature selected for this task. It accepts no candidature selector and returns only a bounded acknowledgement. It does not introduce field mutation, generic candidature mutation or a new external result model.

Broad/private experiences whose value depends on the local corpus itself—such as seeing all candidatures together or inspecting complete private user data—remain AAAAT application experiences. An external host may direct the user to AAAAT, or a future bounded capability may open the application, rather than recreating those views by exporting the underlying corpus.

Migration 010 stores only this task-specific selection state. It is not a generic permission registry. Migrations 001–009 remain immutable.

## Consequences

- External AI can participate in one existing-candidature round trip without receiving broad local authority.
- Data disclosure remains proportional to the named operation instead of being globally fixed or globally open.
- Existing candidature-field AI privacy preferences remain meaningful within the task projection.
- Future named or user-defined tasks can use different bounded schemas without requiring a CRUD API or generic agent framework.
- Returned external material becomes an ordinary Source through existing domain authority.
- The external host does not become an alternate UI for AAAAT's private corpus.
- Manual/no-AI candidature work remains complete.
- No generic task queue, permission framework, context registry, REST layer, adapter broker or new dependency is introduced.
