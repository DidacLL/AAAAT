# AAAAT v1 release requirements trace

This document registers the v1 release requirements that were exposed during the PR37 rebuild conversation and turns them into a traceable repository artifact. It is not a redesign document and not a task backlog. It exists to preserve the product contract so later implementation work does not re-litigate or accidentally erase already-accepted requirements.

Baseline source: accepted PR37 desktop behavior, merged PR #43 rebuild state, maintainer review feedback from the v1 release-readiness conversation, and the companion context seed in `docs/planning/v1-release-readiness-seed-prompt.md`.

Status vocabulary:

- Accepted: requirement is part of the v1 product contract.
- Partially implemented: code/data/docs contain meaningful support, but v1 behavior is not complete.
- Implemented baseline: current branch contains a working baseline for the requirement, though normal release hardening may still be needed.
- Rejected: explicitly not part of the v1 product contract.

## Product contract

| ID | Requirement | Actual meaning | Current trace status |
| --- | --- | --- | --- |
| V1-R001 | Local-first job-application workspace | AAAAT manages candidatures locally from raw offer through analysis, editable preparation, generated materials, local artifacts, and sent-state tracking. It is not a generic CRM and not an autonomous job bot. | Accepted; partially implemented |
| V1-R002 | Provider-agnostic bounded generation | Provider adapters and task execution must stay replaceable and bounded. The product must not couple v1 to a specific hosted provider API. | Accepted; partially implemented |
| V1-R003 | wx desktop is the canonical human runtime | The v1 user interface is the local wx desktop. Browser dashboard, FastAPI server, local webapp, static export, HTTP dashboard runtime, ports, CSRF/Host/Origin/browser security surface, and browser launchers are not active product runtime. | Accepted; implemented baseline after PR #43 |
| V1-R004 | No runtime mode abstraction for the only local UI | With one local readable/editable desktop UI, `read-only`, `static_demo`, `local_dashboard`, `local_render`, and similar mode-era concepts are residue unless they protect a real boundary. They should not remain as user/runtime modes. | Accepted; implemented baseline after mode cleanup |
| V1-R005 | Human operator remains in control | AAAAT may assist, generate, summarize, and render, but it must not behave as a hidden autonomous decision system. Agent work is explicit, bounded, and local. | Accepted; partially implemented |
| V1-R006 | No hallucinated workflow-command fields | `prepare_first`, `prepare_later`, `next_action`, and `technical_reading` are not product fields. The app must not tell the user what to do through invented lifecycle guidance fields. | Rejected fields removed from active product contract; verify during release hardening |
| V1-R007 | Status is active/closed only | Candidature lifecycle for v1 is normalized to `active` and `closed`. Older or richer workflow statuses are not the v1 status contract. | Accepted; implemented baseline |
| V1-R008 | URL traceability is not lead source | A URL/source URL may exist as provenance or traceability. A persisted/user-facing lead-source field such as RemoteOK/LinkedIn/source/source-board is rejected as active v1 model noise. | Accepted distinction; verify UI/projection residue during hardening |
| V1-R009 | Behavioral tests over blacklist tests | Tests should prove correct flows and outcomes. They should not ban trivial words or names through brittle blacklist guards. | Accepted; partially implemented |

## Required v1 workflow

| ID | Requirement | Actual meaning | Current trace status |
| --- | --- | --- | --- |
| V1-R101 | Offer-first candidature creation | The user can create a candidature from raw pasted offer/application text, optionally with typed fields, then let local tasks infer structured candidature details. | Accepted; partially implemented; current `+` flow is only a narrow raw-posting launch fix |
| V1-R102 | Preserve raw offer/provenance | Original job/application text remains stored and readable. It can inform generated fields but must not disappear behind summaries. | Accepted; partially implemented |
| V1-R103 | Automatic analysis outputs remain editable | Evaluation, strategy, fit, risks, company context, keywords, recruiter prep, and generated application materials are assistant-generated support, not immutable truth. The user can edit meaningful values. | Accepted; partially implemented |
| V1-R104 | Form answers are generated material, not a Smart field | Application form requirements and generated answers belong to detailed/material workflow, not as a compact Smart View information tile. | Accepted; partially implemented |
| V1-R105 | Local versioned artifacts | CV, cover letter, recruiter material, form answers, and related outputs render locally into versioned immutable artifacts. Broken renders should fail before saving. | Accepted; partially implemented |
| V1-R106 | Sent/material tracking | Generated artifacts and material state should support visible tracking of versions and sent/use state. | Accepted; groundwork exists; visible v1 workflow incomplete |
| V1-R107 | Task state must be visible enough to trust | Background/bounded task execution should not block wx, and task state/results should be understandable from the desktop. | Accepted; partially implemented |

## View requirements

| ID | Requirement | Actual meaning | Current trace status |
| --- | --- | --- | --- |
| V1-R201 | Smart View is panic-mode fast recall | Smart View is for live calls, interviews, recruiter contact, and low-attention review. It should show useful candidature context quickly, with stable locations and minimal noise. | Accepted; partially implemented |
| V1-R202 | Smart View is not Detailed View | Smart View should not become a form wall, CRUD wall, action wall, or generic metadata dashboard. It is read-oriented and focused on immediate call usefulness plus primary notes. | Accepted; partially implemented |
| V1-R203 | Smart View must expose useful call content | Smart should prioritize pitch, snapshot, ask/questions, recognize/call signals, avoid/risks, fit, strategy, company/recruiter context, evidence/strengths, stack, keywords in context, notes, and the original posting. | Accepted; partially implemented |
| V1-R204 | Original posting must be readable but not dominate the top | The literal offer/posting text is important and must be available. Because it is often long, it should not destroy the first visual hierarchy needed in panic mode. | Accepted; current Smart structure reflects this but needs visual validation |
| V1-R205 | Smart layout must not hide text through broken widgets | No horizontal infinite growth, no right-panel overlap, no chaotic WrapSizer clouds, no internal card scrollbars for normal text, no hidden truncation where the user expects readable content. | Accepted; recent wrap fix implemented baseline; needs continued wx validation |
| V1-R206 | Smart locations should be stable | Do not move fields around based on content length or arbitrary inference. Stable location matters during calls. | Accepted; partially implemented |
| V1-R207 | Detailed View is the complete candidature editor | Detailed uses a left candidature list/table, central complete body, field-local in-place editing, field-specific generated controls, and a right context/options rail. | Accepted; partially implemented |
| V1-R208 | Detailed values are editable in place | No page-wide edit mode. Every meaningful candidature value should have local edit affordance near the field. Raw/provenance may be treated specially but should not be used to make the product broadly read-only. | Accepted; partially implemented |
| V1-R209 | User View is a professional/career workspace | User View should contain rich professional/career context and all meaningful user facts editable, not a pruned read-only profile card. | Accepted; behind target |
| V1-R210 | Right context rail supports context, not clutter | Smart/Detailed right-side panels may show notes, keywords, artifacts/materials, company/recruiter context, tasks, and generation actions, but should not swamp Smart with long generic action buttons. | Accepted; partially implemented |

## Data and boundary requirements

| ID | Requirement | Actual meaning | Current trace status |
| --- | --- | --- | --- |
| V1-R301 | Projection boundary remains explicit | Desktop views consume a local projection/payload boundary. Preserve PR37 projection/navigation contracts while removing obsolete mode/browser concepts. | Accepted; partially implemented |
| V1-R302 | Agent access is descriptor/CLI bounded | Agent-facing operations should be local, explicit, and bounded through descriptors or CLI handles, not HTTP dashboard scraping or hidden browser automation. | Accepted; partially implemented |
| V1-R303 | Primary notes are local editable state | Smart primary notes are a legitimate direct desktop edit path. They should save locally without read-only/mode gates. | Accepted; implemented baseline |
| V1-R304 | Keywords are candidature/user context | Keywords should link and support definitions/follow-up. Manual keyword definitions should not be destroyed by regeneration. | Accepted; partially implemented; verify preservation during hardening |
| V1-R305 | Generic inference must be constrained | Automatic inference can fill relevant candidature details but must not invent lifecycle/status, lead source, material sent state, CV/letter state, or form-answer state. | Accepted; partially implemented |

## Current accepted implementation evidence

- PR #43 merged the PR37-based rebuild into `didacll/local-desktop-dashboard` at merge commit `2b02f8de62543721cb247e7eedf19f0e4a2ac3ca`.
- `docs/planning/v1-release-readiness-seed-prompt.md` records the accepted rebuild context and lessons for future agents.
- `aaaat/ui_desktop/app.py` exposes the desktop launcher without read-only/static modes.
- `aaaat/ui_desktop/smart_view.py` no longer imports the deleted security mode module, no longer passes a mode into projection construction, and treats local notes/right-panel editing as editable desktop operations.
- `aaaat/ui_desktop/center_cards.py` contains the current Smart structured card surface and recent text-wrap repair history.
- `aaaat/dashboard_projection.py`, `aaaat/payload.py`, and desktop panels are the current projection/view boundary to inspect when validating field exposure.
- `aaaat/tasks.py`, `aaaat/task_runner.py`, `aaaat/provider_adapters.py`, and `aaaat/ui_desktop/task_worker.py` contain the local bounded generation/task groundwork.
- `aaaat/templates.py` and artifact event/storage code contain the local rendering/versioning groundwork.

## Known gaps tracked by this register

- Full dynamic candidature creation workflow is not complete.
- Detailed View is not yet fully polished as the complete editor workflow.
- User View still lacks the intended full professional/career editing coverage.
- Material/artifact/task state presentation is groundwork, not final v1 desktop workflow.
- Smart View requires continued wx validation against real screenshots, especially wrapping, long posting placement, right-panel overlap, and first-sight call readability.
- Residue review should continue for old browser/server/mode terminology when touching related files, but through behavior and architecture checks, not brittle blacklist tests.
