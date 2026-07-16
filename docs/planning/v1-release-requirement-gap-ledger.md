# AAAAT v1 release requirement gap ledger

Status: active implementation ledger for PR #45.

Authority: `docs/requirements/v1-authoritative-requirements.md`.

This file records what must be implemented before human review. It is not a second requirements source. When wording conflicts, the authoritative requirements win.

## A. Confirmed working behavior

These behaviors were exercised successfully in the first human review and should be preserved:

- installed commands start;
- MCP descriptor validation succeeds;
- browser-host self-test emits valid JSON;
- runtime does not require Git;
- wx desktop opens without traceback;
- manual use remains available without AI;
- no named-provider selection appears in standard setup;
- candidature creation, view switching, persistence, refresh, and restart work;
- Smart View selection, keyword focus, glossary updates, the single note, splitter behavior, links, and card refresh work;
- Detailed View field persistence and multiline editing work;
- atomic task acquisition worked in the tested case;
- restart preserved candidature edits, note, glossary, completed work, progress/state coherence, artifacts, stale-capability behavior, and removal of provider-specific configuration.

Automated tests must not destabilize these accepted behaviors while correcting the gaps below.

## B. Release blockers to implement

### B1. Correct clean-workspace onboarding

Current failure: a clean workspace only states that no candidature exists.

Required implementation:

- explain in plain user language what the empty workspace is for;
- provide an obvious action to create/import the first candidature;
- provide manual continuation without any technical setup;
- do not show queue, task, capability, MCP, command, storage, or provider internals.

Required tests:

- empty-state projection contains a user action, not only an absence message;
- manual first-use path works with no integration configured;
- source-level wording tests are not sufficient: exercise the view action and resulting candidature flow.

### B2. Restore the actual Smart View contract

Current drift observed:

- invented or unrelated fields were treated as required;
- task/state information was considered acceptable Smart View content;
- generic dashboard assumptions leaked into review expectations.

Required implementation:

- Smart View remains a sparse recruiter-call cockpit;
- no task list, task states, integration state, broad artifact history, or generic `next action` field;
- show only agreed call-support content;
- retain the single candidature note;
- retain selectable keywords and the Smart View glossary panel;
- keep the Smart View right panel focused on the call/keyword use case.

Required tests:

- projection-level assertions for the actual Smart View sections;
- explicit absence of task/integration clutter from Smart View;
- one-note save/reload behavior;
- no assertions for invented CRM fields.

### B3. Restore the actual Detailed View contract

Current drift observed: Detailed View was reviewed as if it reused Smart View concepts and panels.

Required implementation:

- complete candidature inspection/editing using the accepted domain fields;
- no Smart View glossary/keyword-definition panel;
- candidature keyword editor selects or creates structured keyword records;
- the Detailed View right-side content, if present, is specific to editing and inspection;
- no internal IDs, paths, task states, capabilities, or integration instructions in normal UI.

Required tests:

- Detailed View does not instantiate the Smart View keyword pane;
- keyword edits create/select canonical keyword records rather than storing detached text;
- saving one section does not overwrite another;
- restart persistence for representative scalar, multiline, keyword, and artifact-reference fields.

### B4. Enforce one candidature note

Current poisoning: requirements and review text repeatedly described plural candidature notes.

Required implementation:

- one editable note value per candidature;
- save updates that value;
- no duplicate-note creation semantics in candidature UI;
- separate keyword notes or provenance notes remain separate domain concepts.

Required tests:

- repeated candidature-note saves update one value;
- no candidature-note collection is exposed by wx;
- migration preserves the existing note value.

### B5. Make standard assisted onboarding understandable

Current failure: internal architecture and setup instructions leak into user UI; no understandable setup path exists.

Required implementation:

- standard onboarding starts with Connect my AI, then lets the connected LLM choose the best host-native route;
- explain what information may be shared, who owns credentials, and when approval is needed in plain language;
- use a paired local bridge for capable hosts; host tools/skills/scripts and portable transfer are fallbacks in that order;
- no ports, executables, argv, task handles/capabilities, queue states, SDKs, or protocol internals outside Advanced/troubleshooting;
- manual use remains obvious; portable transfer is the last assisted fallback;
- Advanced contains the explicit technical user-owned command.

Required tests:

- behavioral tests for capability-led host selection, pairing, and the no-local-tools fallback;
- source guards only for high-risk forbidden internals in standard panels;
- Advanced-only test for command configuration.

### B6. Remove internal-ID workflows from normal assisted review

Current failure: the review required a human to create tasks using an application ID. Invalid input produced a foreign-key traceback.

Required implementation:

- normal assisted work originates from wx actions or bounded create-candidature/deferred-work actions;
- users are not asked to discover or fabricate application/task IDs;
- broad local/admin CLI may retain IDs for maintenance, but docs and release review must label it admin-only;
- invalid IDs produce concise errors without tracebacks.

Required tests:

- wx action creates the correct bounded work without user-supplied IDs;
- bounded action creates internally bound deferred work;
- invalid admin ID returns a stable nonzero exit and concise message;
- no raw SQLite exception reaches the user.

### B7. Complete progress UX and executable review path

Current failure: progress existed conceptually but no usable human instructions were provided.

Required implementation:

- external wrapper can report phase/message/optional percentage for an active capability;
- wx shows understandable progress for the relevant assistance operation;
- completed, failed, cancelled, stale, and superseded attempts reject further progress;
- progress language in wx is user-facing, not queue-state jargon.

Required tests:

- canonical progress service state transitions;
- CLI, MCP, and paired-host bridge wrappers call the same service;
- wx projection refreshes after progress;
- supplied deterministic fixture demonstrates the full path.

### B8. Make paired MCP operational and reviewable

Current failure: launching a raw stdio process is not a usable connected-host flow.

Required implementation:

- keep paired stdio MCP limited to setup verification and the canonical work tools;
- provide a host-only connection brief, opaque pairing, revocation, and a bridge that accepts no storage argument;
- ship a small deterministic MCP smoke client or documented standard-client configuration that actually initializes, lists tools, claims work, reports progress, and submits a result;
- stdout remains protocol-only; diagnostics use stderr;
- normal-user documentation must never expose an idle server process, storage path, capability, or bridge command.

Required tests:

- pair then subprocess round trip using the shipped smoke client/fixture;
- initialize, tools/list, ping, get-next-work, progress, submit-result, malformed method;
- no split context tool or broad data tool.

### B9. Replace browser companion with a paired host bridge

Current failure: the browser extension is an unrequested JSON-paste workflow, not a provider-agnostic connected-LLM route.

Required implementation:

- remove the browser extension and native-message setup from v1;
- wx shows only ready to connect, connected, needs attention, and paused, with revocation;
- the LLM owns provider-specific installation/configuration with its own permission model;
- no broad data enumeration, provider credentials, storage path, command, or internal ID reaches normal UI or task data.

Required tests:

- bridge pairing/revocation and stale-capability behavior;
- bridge launch without a storage argument on Windows and Unix path conventions;
- complete result ingestion through canonical services;
- malformed/oversized messages fail safely.

### B10. Complete portable task/result fallback

Current failure: no executable last-resort fallback existed for a host without local bridge access.

Required implementation:

- wx action exports one complete portable work bundle for selected eligible assistance;
- bundle explains how the external AI should return results;
- standard connected onboarding selects this only after reporting that no local host route is available;
- wx imports the returned result bundle;
- independent valid sections survive unrelated invalid sections;
- duplicate, altered, stale, unauthorized, or cross-task results are rejected;
- no repeated card-by-card copy workflow.

Required tests:

- wx export/import flow;
- full deterministic round trip;
- partial-valid result behavior;
- structural privacy assertions and path confinement.

### B11. Complete Advanced command workflow

Current failure: no concrete configuration or review instructions existed.

Required implementation:

- Advanced-only fixed argv editor with explicit trust disclosure;
- deterministic example fixture shipped for testing, not a provider adapter;
- stdin receives one complete work item;
- stdout accepts one result envelope;
- stderr carries optional diagnostics/progress;
- timeout, nonzero exit, empty stdout, malformed JSON, and wrong-result schema are understandable failures;
- disabling/removing the command returns to manual mode cleanly.

Required tests:

- deterministic fixture end-to-end;
- failure modes above;
- no conversion from standard onboarding or generated connector content.

### B12. Guide profile completion and artifact rendering

Current behavior: rendering correctly rejects missing required variables, but exposes a Python traceback and gives no supported human path to complete them.

Required implementation:

- User view clearly identifies required missing profile values;
- render action directs the user to complete those fields;
- CLI returns a concise actionable error without traceback;
- after completion, CV and cover-letter rendering works through supported UI/CLI paths;
- cover-letter rendering in normal UI does not require the user to supply an internal candidature ID;
- artifact records remain linked internally and visible/editable in wx.

Required tests:

- missing-variable UI and CLI behavior;
- successful render after profile completion;
- local path confinement and provenance;
- no uncontrolled artifact duplication.

### B13. Fix Windows backup

Observed blocker: `PermissionError [WinError 32]` while cleaning a temporary SQLite copy.

Required implementation:

- close every SQLite backup/source/destination connection before archive creation and temporary-directory cleanup;
- avoid retaining file handles through row/connection objects;
- produce a valid backup archive on Windows;
- verify restore into a separate workspace;
- give concise errors when source files are actively unavailable.

Required tests:

- Windows CI job for backup and restore;
- Unix backup and restore remains green;
- backup while desktop/database connection is cleanly closed;
- archive contents and restored data verified behaviorally.

### B14. Fix expected-error handling

Observed failures exposed raw tracebacks for invalid IDs, foreign keys, missing applications, missing template variables, and backup cleanup.

Required implementation:

- define a small CLI/user-error boundary;
- catch expected domain, validation, SQLite integrity, JSON, template-variable, path, subprocess, and wrapper errors;
- print concise actionable messages to stderr;
- return stable nonzero exit codes;
- reserve tracebacks for explicit debug mode or unexpected defects.

Required tests:

- representative expected errors produce no `Traceback`;
- exit status and message category are stable;
- no mutation occurs after rejected input.

### B15. Replace superficial privacy checks

Current failure: grep-based checks were proposed as privacy evidence.

Required implementation/tests:

- recursively inspect exact agent-facing object structures;
- assert allowed keys by schema and forbidden key absence at every level;
- prove internal IDs cannot authorize mutation;
- prove one capability cannot access or mutate another task;
- prove invalid/stale/completed/superseded capability rejection;
- prove output paths remain AAAAT-controlled;
- prove invalid input does not mutate unrelated records;
- prove wrappers are behaviorally equivalent at canonical boundaries.

Text search may supplement these tests but cannot be the acceptance gate.

## C. Documentation and test poisoning to remove

The following categories must not drive implementation:

- early dashboard/browser/static-export seed requirements;
- historical runtime-split documents that require a separate context fetch;
- descriptor-only MCP claims;
- `task_handle` terminology where the implemented contract is an attempt capability;
- AAAAT-managed generated connector installation/activation language;
- plural candidature-note language;
- generic `next action`, priority/location/keyword visibility assumptions not grounded in the accepted view contract;
- tests that assert exact incidental wording instead of product behavior;
- review scripts that require fabricated internal IDs or unexplained protocol processes;
- PR descriptions claiming readiness before platform-specific and human workflows pass.

Required cleanup:

1. Add explicit deprecation banners to retained historical files.
2. Remove obsolete commands and workflows from active README, CLI, security, MCP, agent, release, and install docs.
3. Rename or rewrite tests whose names preserve obsolete architecture.
4. Delete dead compatibility modules rather than leave misleading examples.
5. Keep one active requirements authority and this implementation ledger only.

## D. Implementation sequence

1. Documentation/test authority cleanup.
2. wx empty state and correct Smart/Detailed responsibilities.
3. one-note and structured-keyword corrections.
4. standard assisted onboarding UX.
5. CLI/user error boundary.
6. Windows backup/restore.
7. guided profile completion and rendering.
8. canonical progress UX.
9. executable MCP fixture and documentation.
10. paired host bridge installation and round trip.
11. portable export/import round trip.
12. Advanced command fixture and failure handling.
13. structural privacy and cross-wrapper equivalence tests.
14. Linux and Windows automated gates.
15. new human review based only on actual wx workflows and supplied fixtures.

## E. Human-review eligibility

PR #45 must remain draft until all B items are implemented or explicitly removed from v1 by direct maintainer decision.

A green Python-only behavioral matrix is insufficient.

Before marking ready:

- Windows backup/restore is green;
- clean wx onboarding is understandable;
- Smart and Detailed views match their distinct use cases;
- standard assisted onboarding is executable without internal jargon;
- paired-host/portable, progress, Advanced, and rendering demonstrations have concrete supplied instructions or fixtures;
- expected invalid inputs do not expose tracebacks;
- the PR body lists unresolved manual gates honestly.

## F. Automated implementation closure record

The prior closure record is superseded by the connected-LLM correction. Fresh
automated evidence has been recorded after the paired-host implementation:

- focused host-connection/MCP/onboarding/integration/error tests passed;
- complete suite passed: 160 tests on Windows/Python 3.13;
- local release validator passed its automated gates, including Windows backup
  and restore into a separate workspace;
- wheel and sdist were built outside the checkout, installed into fresh
  environments, and exercised through the installed MCP and paired-bridge
  stdio smoke clients; the paired smoke requires the installed bridge console
  command rather than a module fallback;
- the installed release validator passed against a disposable external
  workspace.

This closes the automated implementation evidence for B1–B15. It does not
replace the human-review eligibility gates in section E: the PR remains draft
until a human observes the wx flows and a real host's capability-led connection
flow.
