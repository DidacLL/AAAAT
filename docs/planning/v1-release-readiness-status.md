# AAAAT v1 release readiness status

Status: LIFECYCLE CONFORMANCE CORRECTIONS IMPLEMENTED; AUTOMATED AND HUMAN VALIDATION PENDING; NOT READY.

Branch: `didacll/v1-lifecycle-conformance`
Base reviewed head: `c9f1713375c532cf67543a3f2c6262d740f2fcea`

## Corrections on this branch

- one canonical candidature lifecycle registry is used by desktop actions and bounded host requests;
- lifecycle-specific work packets now provide the required source, candidature, strategy, evaluation, and exposure-controlled profile context;
- task-specific result schemas reject unrelated fields and invalid types before completion;
- blocked and failed work cannot run or accept results;
- portable export claims queued work and excludes blocked work;
- canonical ingestion releases newly ready downstream tasks for every transport;
- explicit desktop assistance requests are selected before background work;
- profile completion no longer discloses existing raw protected values;
- generated artifacts remain drafts until the user changes their state;
- Detailed View can render the selected candidature's prepared CV and cover-letter material;
- the open wx desktop polls a cheap local revision token and refreshes after paired or portable results;
- the paired status tool returns a provider-neutral AAAAT assistant contract without adding a plugin framework or broad resource surface;
- host-originated candidature creation can request extraction, evaluation, strategy, research, recruiter, interview, form, CV, cover-letter, keyword, and keyword-definition work through the same lifecycle definitions.

## Validation still required

Before `RELEASE_READY`:

1. the complete behavioral matrix must pass on Python 3.11, 3.12, and 3.13;
2. native package verification must pass on Windows, macOS, and Linux;
3. a human must exercise clean first use, manual operation, conversational connection, explicit desktop task routing, progress, failure/retry, portable exchange, selected-candidature rendering, backup/restore, and restart persistence;
4. the resulting package artifacts must be downloaded and exercised outside the repository checkout.

Green tests or package builds do not replace the human product demonstrations. This branch must remain isolated from the reviewed recovery branch until those gates pass and the maintainer decides how to integrate it.
