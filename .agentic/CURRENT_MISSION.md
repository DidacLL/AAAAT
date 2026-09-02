# M2 — Candidature Workspace

## Outcome

AAAAT lets the user manually track job-search opportunities inside the user-owned workspace, retain useful source material and notes, search and organize candidatures by a small lifecycle, attach shared concepts and existing documents, and use focused recruiter-call views without AI.

## Required

- candidature records remain useful with partial information
- store the demonstrated opportunity fields needed for manual tracking: company, role, location, work mode, salary text, source/source URL, status, relevant dates, next action, and notes
- lifecycle states stay small and understandable; archiving remains independent from lifecycle state
- durable candidature mutations use explicit application services and the existing workspace SQLite/migration rules
- narrow validated preload/domain methods; no generic CRUD, SQL, filesystem, shell, or Electron authority
- manual creation, editing, archiving, search/filtering, and status organization through the desktop UI
- preserve source material needed to understand where a candidature came from
- shared technologies/domain concepts/role keywords only to the extent needed by M2, with candidature associations and concise definitions/aliases where demonstrated
- recruiter-call/focus views are projections over candidature records and shared concepts, not separate domain models
- associate existing M1 CV/cover-letter documents with candidatures without changing document portability or canonical-profile semantics
- behavior/domain tests for persistence, lifecycle, search, associations, and renderer privilege boundaries
- packaged runtime evidence remains focused on critical persisted/security boundaries rather than expanding into a large UI smoke suite

## Explicit non-goals

- AI providers, extraction, recommendation, tailoring, drafting, or privacy projection (M3)
- MCP, external agent commands, host integrations, installer automation, or portable AI exchange (M4)
- company-research agents, task/workflow engines, background schedulers, or general CRM infrastructure
- generic repositories, REST/GraphQL APIs, ORM, Redux, event buses, or plugin frameworks
- cloud synchronization or multi-user collaboration
- v1 compatibility or migration
- reopening the M0 Electron/SQLite boundary or M1 workspace/profile/document contracts without concrete evidence

## Completion

A user can create and maintain incomplete candidatures manually, find and organize them quickly by search/status, retain source and notes, associate useful concepts and existing documents, archive independently from status, and open a focused recruiter-call view that surfaces the selected opportunity and its relevant context. Independent review accepts the result without M3/M4 infrastructure or speculative abstractions.
