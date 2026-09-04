# ADR 0013 — Live sparse candidature information fields

- Status: Accepted for corrective M6
- Date: 2026-09-04
- Decision class: C
- Issue: #150
- Supersedes: ADR 0012 where it defines fixed candidature working-brief, priority, legacy source compatibility, or fixed ordinary candidature properties

## Context

Current Product Owner authority defines AAAAT as a sparse local candidature-information workspace and artifact generator, not an application lifecycle tracker, recruiter-preparation workflow, or completeness system. Ordinary candidature information is open-ended during normal product use: a user may add a field after many candidatures already exist, and missing values remain normal.

M6 development code instead privileged a closed set of candidature columns, priority, one working-brief row, hard-coded Focus composition, and fixed AI extraction fields. There is no real-user v2 persistence baseline requiring those development representations to remain compatible.

AAAAT must preserve explicit domain entities such as Sources, Concepts, ToDos, Documents/Artifacts, Profiles/Variants and AI Connections. The correction therefore needs one deliberately bounded extensibility seam rather than a generic entity/attribute platform.

## Decision

`candidatures` stores structural candidature identity, archive state and timestamps only.

Ordinary candidature information is represented by three AAAAT-specific persistence concepts:

1. `candidature_fields` — stable local field identity plus label, description, small value type, cardinality, optional stable choice IDs, enabled state and optional AAAAT-owned `system_key`.
2. `candidature_field_preferences` — independent Focus visibility/order/prominence, identity order, AI discovery permission and AI context mode.
3. `candidature_field_values` — one sparse JSON value per candidature/field pair, validated by the application service against the current field definition.

No value row means AAAAT does not retain that information. It does not mean the candidature is incomplete.

Built-in and later-created fields use the same value table and the same validated set/clear mutation path. A small seed catalogue provides optional organization, role, location, compensation, application date and notes fields. No seed creates a candidature value.

The application service enforces 64 enabled fields and 32 AI-discovery fields. These are product guardrails, not SQLite constraints. Type/cardinality or choice-ID changes are rejected while retained values exist; labels, descriptions and choice labels may change without changing field identity. Built-in fields may be retired but not physically deleted. Custom fields with retained values must be retired rather than deleted.

`candidature_sources` remains an explicit first-class relation. The old root source columns and `candidature_working_briefs` do not survive the corrected development schema.

Filtering accepts only a registered field ID and a whitelisted operator derived from its type. SQL is application-owned and parameterized; callers cannot provide table/column names or SQL fragments. Many-choice `contains_any` and `contains_all` operate on sets of stable choice IDs; duplicate filter IDs do not change semantics.

Focus is a projection over retained field values selected by field preferences plus explicit structural components such as Concepts and Documents. It does not persist another candidature-shaped value model and has no built-in recruiter-call hierarchy.

AI Source discovery is generated from the currently enabled fields whose `ai_discovery` preference is true. Requests include stable field ID, current label/description/type/cardinality/choices. Provider proposals are rejected unless the field was requested and the value validates against the current definition. Accepted proposals use the ordinary field-value mutation path. Ordinary Source analysis cannot create field definitions.

Historical rediscovery is a bounded proposal operation over explicitly retained Sources for one candidature and one registered field. It never writes or silently replaces an existing authoritative value. Retained Sources are not implicitly included in fit, variant-recommendation, CV-tailoring or cover-letter AI contexts; those operations receive only candidature information that has passed field-level AI context preferences. A Source reaches AI only through an explicit Source-analysis/discovery operation selected by the user.

Privacy tokens are local opaque placeholders generated to avoid collisions with raw or exposed operation context, and result rehydration is a one-pass substitution so restored private text cannot be interpreted as another token.

## Consequences

- A Source-only or completely sparse candidature is valid.
- Adding a field creates no rows for existing candidatures and requires no migration, IPC contract, renderer component, filter implementation, or AI prompt change for that semantic field.
- Field renames preserve values, filters, Focus and AI configuration through stable IDs.
- Different professions can define their own ordinary candidature vocabulary without changing AAAAT code.
- The renderer stays progressive: retained information is visible; missing registered fields appear only through `Add information` or configuration surfaces.
- Manual/no-AI workflows remain complete.
- Fixed status, priority, next action, recruiter preparation and working-brief semantics have no privileged architecture. A workspace may create equivalent optional fields if useful.
- Development migrations and fixtures are corrected directly because no real-user v2 baseline exists. A future declared real-use baseline starts normal forward-only migration discipline from that point.

## Rejected alternatives

- Wide nullable candidature columns: every new user-relevant semantic field still requires coordinated code and schema changes.
- Fixed columns plus `extras_json`: creates two classes of otherwise ordinary candidature information and two mechanisms for Focus/filtering/AI.
- Universal EAV/custom database: erases domain boundaries and creates a framework disproportionate to AAAAT.
- Keeping M6 fixed-field projections for compatibility: preserves rejected development assumptions for users who do not exist and creates duplicate authority paths.
- Generic migration/conversion engine for field type changes: not required; reject unsafe shape changes while values exist.
