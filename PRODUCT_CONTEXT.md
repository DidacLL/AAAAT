# AAAAT Product Context

**Status: explanatory Product Owner context. Non-normative.**

This document preserves rationale, examples, historical product learning, deferred ideas and semantic clarifications that help interpret `PRODUCT_DEFINITION.md`.

It does not independently create requirements.

If an idea here conflicts with `PRODUCT_DEFINITION.md`, the Product Definition governs. If an apparent contradiction remains unresolved after consulting owner-source material, ask the Product Owner rather than inventing a reconciliation.

## Convenience is the underlying motivation

AAAAT began from the practical friction of job searching: information is repeatedly copied between job websites, notes, recruiters, AI chats, CVs, letters and applications.

The owner consistently optimizes for less typing, fewer clicks, less repeated organization, less searching and less learning of tool-specific UI.

Architectural elegance that increases those costs is contrary to the product even when technically clean.

## Raw job material is a natural starting point

A central expected journey is:

```text
find job
→ copy job material
→ paste into AAAAT
→ keep it immediately
```

If suitable intelligence exists, extraction should happen as an implementation of that AAAAT action rather than requiring the user to formulate an AI request.

If there is no AI, retaining the raw material remains useful.

Future deterministic cleanup of copied website content may reduce clutter before extraction or manual use.

## AI inside AAAAT is not conversational

The user normally interacts with the AAAAT domain, not a model.

“Extract company and salary from this offer” describes what software may do internally. It is generally not intended to be a prompt the user must write.

Intelligence should disappear behind understandable product actions where reliability permits.

## External AI is different

An external AI application may already be the user's working interface.

In that direction, AAAAT should expose bounded useful capabilities through whatever integration mechanism is appropriate for the external host.

MCP, skills, plugins, commands, APIs and similar transports are mechanisms rather than product meaning.

Copy/paste is an acceptable fallback, not the desired integration experience.

## Candidature overview is about recognition

The owner has long wanted a high-information overview of multiple candidatures.

The important use case is frequently retrieval rather than judgment.

Example:

```text
recruiter calls
→ says company / role
→ user sees candidature corpus
→ recognizes the relevant candidature in seconds
```

This may eventually be represented as cards, list, grid, table or another composition.

The old wx Smart View provided useful evidence for this need, but its widget implementation is not a requirement.

## Focus is fast-recall information design

Once a candidature is identified, Focus supports divided attention.

Its content should help the user recover whatever they personally need while speaking to a recruiter or preparing for an interaction.

The owner has historically valued dense, stable, quickly scannable presentation.

Focus must not become a fixed recruiter script or AI coaching workflow.

## “Cross-candidature” does not mean pairwise comparison

The user should be able to browse, search, filter, recognize, summarize where useful and retrieve across the candidature corpus.

Historical wording such as “cross-candidature analysis” was later transformed into a 2–5 candidature AI comparison feature. That interpretation was drift.

AAAAT is not intended to rank or advise between the user's candidatures.

## Flexible information does not imply visible field administration

The owner requires AAAAT to retain unanticipated information.

The flexible field architecture came from a legitimate need: different professions and opportunities have different useful information.

The user's mental model, however, is information rather than schema.

A visible Field-management experience that requires understanding field definitions, types or configuration is implementation leakage unless deliberately opened as advanced configuration.

## User View

A configurable modular User View was an early legitimate product idea.

Its intention was an optional user-controlled workspace whose visible modules/layout could be configured and persisted.

It later became confused with user/profile navigation and was abandoned in that form.

The original modular idea remains potentially useful, but it is deferred. AAAAT should first have a coherent working product.

The architecture should not deliberately make such a view impossible, but no dashboard-builder framework is currently required.

## Historical view names are not stable product meaning

Terms such as Smart View, Detailed View and User View changed meaning during prior development.

Recover the user job beneath the name.

Durable needs include multi-candidature recognition and retrieval, Focus for rapid recall, complete candidature inspection/editing, and potentially a later user-configurable modular workspace.

Do not preserve a historical view simply because the name appears in old requirements or code.

## Professional information is about reuse

The user wants to maintain professional material once and reuse it.

Variants, canonical profile representations and override rules are mechanisms that may support this.

The ordinary concept remains “my reusable professional information”. A particular CV may deliberately differ from it.

## VCVGenerator has always been independently useful

One valid AAAAT session is simply:

```text
open AAAAT
→ edit CV
→ edit/write letter
→ render
→ leave
```

No candidature and no AI are necessary.

At the same time, candidature-specific documents should naturally remain connected to their candidature.

## Shared Concepts came from reuse, not knowledge management

Keywords and definitions encountered in one candidature may be useful in another.

The intention is to avoid relearning/recreating relevant job-search concepts and to make them useful during Focus/search.

It is not a generic personal knowledge base.

## Research is optional enrichment

The owner has contemplated useful external information such as company legitimacy, company context or relevant recent information.

That does not establish a dedicated AAAAT research workflow.

It may come from the user's external AI application, another configured service, manual research, or eventually a native capability if justified.

At this stage, the mechanism is secondary.

## AI opinion is permitted but not foundational

A user may deliberately ask an AI what it thinks about one opportunity.

That does not make AAAAT an adviser and does not justify opportunity ranking, automatic next-step recommendations or a decision-support workflow.

## Deterministic processing should be used where appropriate

AI should not be used merely because it exists.

Cleaning copied website text, identifying conventional metadata or normalizing source content may eventually be better handled deterministically.

The product objective is effort reduction, not AI usage.

## Setup and installer.ai

The owner introduced `installer.ai` because configuring local tools, LaTeX and AI environments can exceed what a traditional installer handles comfortably.

The deeper idea is a shared body of setup knowledge usable by either the graphical application or a chosen AI assistant.

Users should not need to learn technical integration concepts merely to configure AAAAT.

## No real-user v2 data exists yet

Development workspaces, fake fixtures and test databases are disposable.

Schema/migration machinery may still be technically useful, but it does not justify compatibility work for nonexistent users.

A real compatibility obligation begins only after actual user data is deliberately treated as persistent.

## First-run experience

First run should primarily establish a usable workspace.

Create/open are normal actions.

Recovery is secondary and should be discoverable without visually competing with the primary path.

The owner explicitly rejected an oversized recovery presentation and first-run layout that requires excessive scrolling or looks like an undismissable notification.

The distinction is:

- Open existing workspace: use an existing live AAAAT workspace.
- Restore backup: recover/copy a backup into a usable workspace location.

Recovery should not dominate onboarding.

## Product evaluation is not owner QA

Interactive owner evaluation is useful for product judgment.

It should not become the project's mechanism for finding routine engineering defects.

Automated and engineering verification should establish technical correctness before owner attention is requested.

## Source quality and historical interpretation

Not all preserved documents have equal evidentiary weight.

Highest-confidence material includes direct Product Owner statements and owner-authored notes.

AI-generated requirements, Issues, PRs, tests and implementation may preserve real ideas but can also contain semantic drift.

When historical sources conflict, recover the underlying user intention instead of choosing whichever derived document looks most formal.

