# ADR 0001 — Clean v2 restart

## Context

AAAAT v1 proved useful local-first, manual-first candidature workflows and produced valuable visual and domain evidence. It also coupled ordinary AI assistance to external-host protocols, duplicated mutation paths, embedded AI task machinery in the core schema, and accumulated a difficult wxPython state architecture. There are no production users or data contracts that require compatibility.

## Decision

AAAAT v2 is a clean implementation. The active v2 tree does not retain v1 runtime modules, schemas, protocol code, tests, compatibility shims, or Python-to-Node bridges. Git history and the `v1-prototype-final` tag preserve the prototype for research and recovery.

## Consequences

- V2 contracts derive from `docs/SPEC.md` and current user behavior.
- Useful v1 product and visual lessons may be reimplemented deliberately.
- Deleting v1 files from the active tree is expected and recoverable.
- There is no v1 import/migration work unless a later concrete requirement creates it.

## Alternatives rejected

- Incremental wxPython repair: retains the architecture that the restart is intended to replace.
- Python-to-Electron bridge: creates two runtimes and compatibility ownership without user value.
- Side-by-side v1/v2 modules: leaves contradictory active authorities and duplicate behavior paths.
