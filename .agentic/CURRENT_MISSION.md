# Current mission — v2 release readiness

Current explicit Product Owner instruction remains highest authority.

Base main: `9f34eea8a1551cd96f12bb05df6f7e406dc0af98`.

## PLAN state

- PLAN[0] — COMPLETE / RETAINED
- PLAN[1] — COMPLETE / RETAINED
- PLAN[2] — COMPLETE
- PLAN[3] — COMPLETE / RETAINED
- PLAN[4] — COMPLETE
- PLAN[5] — COMPLETE

PLAN[5] completed through the integrated acceptance sequence under #314. The current release-readiness work does not reopen completed product work unless running/package evidence exposes a concrete defect.

PR #414 / `9f34eea` added bounded llama.cpp and packaged-AAAAT MCP preflights so the remaining real local-host evaluation fails at the actual missing boundary instead of stalling opaquely. Superseded PR #413 is closed.

## Current objective

Prepare/deploy v2 from current `main` while the remaining real llama.cpp owner-run evidence continues independently.

Release-readiness boundary:
- one native release path for Windows, macOS and Linux;
- x64 and ARM64 release targets where native GitHub runners exist;
- unsigned alpha artifacts are acceptable; do not add signing/notarization/updater machinery without a separate concrete requirement;
- required engineering hygiene is static typecheck + lint;
- package/release evidence proves packaging only, not product acceptance or model usefulness;
- remove obsolete prototype releases/tags from the public product surface while preserving their commits in Git history;
- clean stale working branches without making historical commits unreachable: retain one archive ref for branch-tip history before deleting old branch refs;
- no feature expansion, test-generation phase, architecture cleanup programme or compatibility/migration ceremony;
- do not reopen #373, which remains a non-blocking future document-source enhancement.

The Product Owner is not routine QA or a prompt courier.
