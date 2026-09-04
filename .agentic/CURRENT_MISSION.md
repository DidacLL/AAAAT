# M7 — Lightweight ToDos

**Status: active.** Product-authority reconciliation is complete enough to resume bounded capability development from `main` `9a6fe0211afb78be95b41b531548e10502ba4c85`.

## Why this Mission

Owner Intent and SPEC explicitly require ToDos as a real AAAAT domain concept, but current implementation has no ToDo persistence, application service, preload contract, or desktop UI. This is a concrete missing capability rather than a speculative roadmap item.

The surrounding corrected product foundation is already in place:

- candidatures are sparse structural containers with live ordinary information fields rather than workflow-shaped root state;
- Sources, Concepts, Documents/Artifacts, Profiles/Variants and AI Connections remain explicit domain concepts;
- Focus is configurable projection rather than fixed recruiter workflow;
- manual/no-AI operation remains complete;
- durable mutations use application services;
- external AI remains bounded and provider-neutral;
- security remains structural and local.

## Mission outcome

AAAAT provides simple user-owned ToDos that may stand alone or relate to one candidature.

A ToDo contains:

- user text/body;
- done/not-done state;
- optional candidature relation;
- normal local timestamps/identity required for persistence.

Users can create, inspect, edit, mark done/not done, and remove ToDos through the desktop application without AI.

Candidature access can show/manage related ToDos without making them workflow steps or required maintenance.

## Acceptance boundaries

- ToDos are explicit domain records, not ordinary candidature information fields and not a generic entity system.
- ToDo mutations use one bounded application service and validated preload/IPC contracts.
- A ToDo may exist without a candidature.
- A candidature may have zero ToDos and remains fully valid.
- Done state is boolean only; no lifecycle/status ontology is introduced.
- Human operation is complete without AI.
- Existing local ownership, renderer isolation, backup/recovery, and packaging boundaries remain intact.
- Tests prove durable ToDo behavior and boundary correctness rather than exact labels, ordering, or incidental UI mechanism.

## Explicit exclusions

This Mission does not add:

- scheduling, due dates, recurrence, reminders, notifications, calendars, or timers;
- priority, next-action semantics, predicted workflow, queues, kanban, or lifecycle automation;
- AI task execution, agent task protocols, autonomous follow-up, or generic task orchestration;
- generic repositories, ORM/EAV, event buses, workflow engines, plugin systems, or future-Mission scaffolding;
- new AI providers, connection architecture, or external integration authority.

## First Issue boundary

The first Issue is the smallest complete vertical slice: local ToDo persistence + application service + typed desktop boundary + minimal manual desktop management + focused tests. It must not start a second ToDo enhancement or another Mission.
