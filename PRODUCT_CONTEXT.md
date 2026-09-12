# AAAAT Product Context

**Status: explanatory Product Owner context. Non-normative.**

`PRODUCT_DEFINITION.md` is the product authority below current explicit Product Owner instruction. This document preserves rationale, examples and historical interpretation so later agents do not flatten the product into familiar patterns.

## The central optimization is friction reduction

AAAAT grew from repeated practical work around applications: retaining offer material, remembering what an opportunity was, reusing professional information, adapting CVs/letters, and moving information between local work and external AI tools.

The recurring owner preference is not more automation for its own sake. It is fewer clicks, less typing, less repeated organization, less searching, less forced maintenance and less learning of implementation vocabulary.

A technically elegant workflow that asks the user to maintain status, stages, priorities, schemas or AI configuration without a concrete need is product regression.

## There is no privileged starting point

A user may arrive because:

- a recruiter is calling and one candidature must be found immediately;
- the user has just found an opportunity elsewhere and wants to retain raw material;
- the user wants to inspect or correct one candidature;
- the user wants to create or revise a CV or letter with no candidature involved;
- the user is maintaining reusable professional information;
- AAAAT is invoking a configured AI for one bounded task;
- an external AI/tool is already doing broader work and calls into AAAAT;
- the user needs setup, backup, rendering or integration administration.

These are peers. The product must not compress them into one canonical journey.

## Job discovery is outside AAAAT's required core

The user may discover opportunities manually, through job sites, recruiters, social contacts, another AI system or another tool. AAAAT does not need to become the job-discovery engine in order to support those scenarios.

Conversely, an external AI may legitimately perform job search/research and then use AAAAT's bounded capabilities. The boundary is ownership of AAAAT data/operations, not a rule about what must happen first in time.

## Raw material is already useful

The owner repeatedly described low-friction capture as retaining whatever exists now. A pasted offer, recruiter message, URL-containing text, form content or fragment is useful before it is structured.

This is why capture must not begin with a large conventional application form or source-classification ceremony.

AI extraction can reduce effort after retention, but absence of AI does not make capture incomplete.

## Focus solves a specific time-pressure problem

The recurring example is an unexpected recruiter/interview call:

```text
company/role is mentioned
→ user must identify the relevant candidature in seconds
→ user must recover the useful context while listening/speaking
```

That need has two distinct perceptual states:

1. **Corpus Focus** for rapid recognition across multiple candidatures.
2. **Selected-candidature Focus** for richer recall once the correct candidature is selected.

The old wx/Smart View implementations attempted this need but were rejected as cluttered, slow and hard to understand. Their cards, pane ratios, click-to-expand mechanics, call cockpit and other layout decisions are not product requirements.

The surviving requirement is two-speed retrieval with scarce screen space used for the current need.

## Focus is deliberately selective

A flexible field system does not imply showing everything in Focus.

The owner wants a small chosen set of fields/signals in corpus Focus and a richer but still curated set in selected Focus. AAAAT can ship default Focus selections, but the user decides which available fields are useful there.

Focus succeeds when the right information is visible at a glance, not when it proves that every domain object can technically be rendered.

## Focus editing is part of friction reduction

Readability is primary during recall, but read-first must not become read-only.

During a live call the user may learn that a salary changed, a recruiter name was wrong, or a new fact matters. If that field is visible in selected Focus, a lightweight edit affordance should allow correction/addition immediately.

The complete candidature editor exists for deliberate maintenance, but the user should not be forced into it for every tiny correction.

## Full candidature work is independent

A user may deliberately open a candidature to inspect or maintain everything without entering through Focus. That view can expose all structured information, Sources, Tags, application material, privacy controls and secondary supporting data.

This is a different intention from rapid recall, not a required second half of the Focus flow.

## Shipped fields are examples, not ontology

Company, role, salary, location, recruiter and similar fields are sensible defaults. They must not become a permanent developer-controlled taxonomy.

The product has always needed to retain unforeseen information because useful facts differ dramatically between professions and opportunities.

The ordinary user should not think in schema-administration terms. Advanced field-definition management may exist, but it is not the mental model of normal information editing.

## Tags are the lightweight shared wiki/glossary

Earlier owner material used Keywords/Tags. Later generated implementation introduced `Concepts` for roughly the same semantic object.

The intended product idea is simple: a reusable term such as `Spring Boot` can have aliases, a definition and notes, can be associated with relevant candidatures, and can be inspected while reviewing one of those candidatures. Improving the shared definition helps everywhere.

This is not AI learning and not a knowledge-management product. The product/domain language should remain **Tags** unless an explicit future distinction is introduced.

## No lifecycle product

AAAAT does not need the user to keep candidature stages, priorities or next actions current. Historical implementations repeatedly imported those conventions because they are common in applicant trackers.

That is not the product. If the user chooses to retain a fact about an application situation, it is ordinary information; AAAAT does not build a lifecycle machine around it.

The same applies to lightweight notes/checkable reminders: useful when attached to a candidature, but not navigation, planning or workflow authority.

## VCVGenerator is a parallel core journey

AAAAT was never only a candidature tracker. One complete session may be nothing more than opening a CV or cover letter, editing it, rendering/exporting it and leaving.

Candidature context should make relevant CVs/letters/artifacts easy to reach, but the document system remains the same independently usable VCVGenerator system.

## Professional information is about reuse

Reusable professional information exists so the user does not repeatedly reconstruct experience, skills, education, projects, identity/contact data and other career material.

Variations and document-specific differences are reuse mechanisms, not user-facing identity architecture.

Common categories are shipped conveniences, not a closed taxonomy.

## AI is optional infrastructure behind domain actions

Inside AAAAT, the user should normally think “help with this Source/field/CV/letter”, not “go operate an AI workspace”. AAAAT chooses the bounded context and invokes a configured intelligence route when useful.

AAAAT owns no inference model. It should not pretend to own provider policy, the external AI's reasoning, account authentication or generic orchestration.

An external AI/tool is also a valid entry surface. It may have done research, job discovery or broader reasoning before using AAAAT. The AAAAT side remains bounded capabilities and local ownership.

## Privacy has separate dimensions

The owner repeatedly distinguishes:

```text
stored locally
shown in Focus
shared with this AI operation
```

These choices must not be collapsed. Focus visibility is presentation. AI disclosure is external exposure. Local storage is ownership.

## Setup is secondary administration

First run should get the user into a usable local workspace. TeX, AI connections, external-host setup and recovery appear when relevant rather than becoming the product's first impression.

Users should not need to understand MCP, IPC, ports, schemas, provider routes or migration history to perform ordinary work.

## Historical evidence must be interpreted, not copied

Most preserved project history is LLM-generated. It can contain real owner intent, wrong assumptions, or later corrections of earlier drift.

Do not treat a formal Issue/PR/test as owner authority merely because it exists. Reconstruct the chronology: what user problem was being preserved, what implementation assumptions were attached, whether later evidence identified them as drift, and what requirement survived.

In particular:

- old Smart/Detailed/User View implementations are not reusable UI designs;
- `Concepts` is not automatically a valid product rename of Tags/Keywords;
- reminder-heavy Focus is not product authority;
- status/priority/next-action/lifecycle conventions are not product authority;
- migration-era compatibility assumptions are not product authority before a real baseline exists;
- current implementation consistency is not evidence that the underlying product model is correct.

## Product evaluation

Owner attention is for product judgment, not routine QA. Engineering verification should establish correctness before asking for evaluation.

When implementation and product authority conflict, correct the implementation—even if that means deleting substantial prior work.