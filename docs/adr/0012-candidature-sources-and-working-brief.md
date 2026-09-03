# ADR 0012 — Candidature sources and current working brief

- Status: Accepted for M6
- Date: 2026-09-04
- Decision class: C
- Issue: #129

## Context

The accepted candidature root can retain one source label, URL, and text. M6 requires several independently meaningful supplied inputs and durable opportunity/recruiter preparation while preserving incomplete candidatures, existing M3 read behavior, and the accepted external `candidature.create` capability.

The M6 user journey does not require a generic content repository, independently identified preparation sections, version history, a workflow engine, or another candidature root.

## Decision

A candidature owns a fixed collection of source records. Each source has a stable ID, candidature owner, one closed M6 origin kind, title, URL, supplied text, and timestamps. Source kinds label origin only and do not drive workflow behavior.

A candidature also owns exactly one current working-brief row containing the eight M6 text values: fit/suitability, strengths/evidence, gaps/risks/constraints, current strategy, company/role context, pitch, questions, and recruiter preparation. Every value may be empty.

Candidature priority is one scalar value: blank, low, medium, or high. It has no scoring or ranking semantics.

Accepted migration 004 remains immutable, so its `source`, `source_url`, and `source_text` columns remain physically present. Migration 008 copies any existing non-empty source triple exactly once into the new source collection. After migration, `CandidatureRecord.source`, `sourceUrl`, and `sourceText` are read-compatibility projection of the first current source ordered by creation time and ID.

The accepted create contract keeps its single-source shape. A non-empty supplied create source is translated into the first source row in the same candidature-service transaction. Ordinary candidature update no longer mutates source data. Post-create source mutation occurs only through explicit list/add/update/remove source services.

Working-brief and source mutations use explicit application-service operations and the existing `candidature_activity` table. Focus remains a renderer projection and is not persisted.

## Consequences

- Existing v2 source data upgrades without loss and existing M3 read contexts can continue consuming the compatibility projection.
- There is one authoritative post-create source mutation path rather than synchronized legacy and collection stores.
- Zero-source candidatures remain valid and deleting a source cannot delete its candidature.
- The working brief stays deliberately current and candidature-specific; there is no history/state machine or generic preparation schema.
- External/MCP authority is not widened.

## Rejected alternatives

- A generic content/section/preparation registry: more abstraction than the demonstrated M6 workflow needs.
- Rebuilding the accepted candidature table to remove legacy source columns: additional migration and foreign-key risk without user value.
- Keeping source fields writable through ordinary candidature update: creates dual authoritative mutation paths.
- Persisting Focus: duplicates authoritative candidature, source, brief, concept, document, and career-context state.
- Priority scoring, ranking, or inference: M6 only needs an optional manual label.
