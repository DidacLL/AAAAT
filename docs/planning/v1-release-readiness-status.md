# AAAAT v1 release readiness status

Status: AUTOMATED LIFECYCLE AND PACKAGE VALIDATION PASSED; RELEASE CANDIDATE ELIGIBLE.

Branch: `didacll/v1-lifecycle-conformance`
Base reviewed head: `c9f1713375c532cf67543a3f2c6262d740f2fcea`

## Corrections on this branch

- one canonical candidature lifecycle registry is used by desktop actions and bounded host requests;
- lifecycle-specific work packets provide the required source, candidature, strategy, evaluation, and exposure-controlled profile context;
- task-specific result schemas reject unrelated fields and invalid types before completion;
- blocked and failed work cannot run or accept results;
- portable export claims queued work and excludes blocked work;
- canonical ingestion releases newly ready downstream tasks for every transport;
- explicit desktop assistance requests are selected before background work;
- profile completion no longer discloses existing raw protected values;
- generated artifacts remain drafts until the user changes their state;
- Detailed View can render the selected candidature's prepared CV and cover-letter material;
- the automated lifecycle validator renders those artifacts for the same completed candidature;
- the open wx desktop refreshes after paired or portable results;
- the paired status tool returns a provider-neutral AAAAT assistant contract without a plugin framework or broad resource surface;
- host-originated candidature creation can request all defined V1 assistance stages through the same lifecycle definitions;
- release verification checks the checksum, extracts the exact platform archive outside the repository checkout, preserves packaged executable permissions, and runs the packaged desktop and bridge from that extracted copy;
- pull-request artifacts contain the runnable platform folder directly, avoiding a nested installation ZIP.

## Automated release evidence

The maintained validation matrix passes:

1. complete behavioral suite on Python 3.11, 3.12, and 3.13;
2. native package build and extracted-archive verification on Windows, macOS, and Linux;
3. deterministic provider-neutral lifecycle validation reporting `RELEASE_READY`;
4. directly runnable pull-request artifacts for all three platforms;
5. no unresolved blocker in the authoritative requirement gap ledger.

Integration or merge is handled separately from release-gate execution.
