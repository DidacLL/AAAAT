# M6 — Opportunity Understanding & Recruiter Readiness

**Status: paused pending product-authority reconciliation.** No product Mission is currently authorized for feature development. Do not start a successor Mission until Product Owner authority, the corrected SPEC, and the actual implementation are used to define it.

## Accepted baseline

M0–M5 remain accepted technical/capability checkpoints. Their evidence is preserved; their historical names and Issue wording do not prove every product assumption attached to them was correct or complete.

- M0 proved the secure Electron/React/TypeScript/SQLite foundation and native packaging boundary.
- M1 proved the VCVGenerator foundation: user-owned workspace, canonical profile and variants, editable CV/cover-letter documents, portable LaTeX, local rendering, and unrelated-directory compilation.
- M2 proved an initial candidature workspace: sparse records, source/notes, search/filtering, concepts, a Focus projection, document associations, and the then-selected status/archive representation.
- M3 proved initial optional direct-AI infrastructure: operation-specific context, privacy projection, typed validation, conflict policy, and normal application-service boundaries.
- M4 proved initial bounded external interoperability and setup infrastructure: packaged candidature creation, official MCP stdio, demonstrated VS Code setup, structured setup knowledge, proposed portable host configuration, and safe workspace backup/restore.
- M5 proved cross-platform alpha hardening and was owner-accepted at PR #121 head `6a4490798399c75a939ccb694e49a21c22ff2802`, including native Windows/macOS/Linux release artifacts and packaged runtime evidence.

### Preserved M5 acceptance evidence

- #111 proves native Windows/macOS ZIP and Linux Debian release artifacts plus artifact inspection and packaged runtime smoke.
- #113 provides installation, first-run, optional-capability, backup/restore, and troubleshooting documentation for the accepted alpha.
- #116 corrects the recovery test so its async rejection evidence is awaited.
- #117 makes packaged Electron shutdown deterministic on Windows; the full matrix and a second Windows packaged-smoke run passed on the same exact head.
- #119 records reproducible dependency-security evidence.
- PR #121 exact head `6a4490798399c75a939ccb694e49a21c22ff2802` passed Fast verification, LaTeX portability, and packaged Windows/macOS/Linux checks and was explicitly accepted by the Product Owner.

Git history and technical evidence remain reachable. AAAAT has no real-user v2 data-compatibility baseline yet: development databases, fixtures, and development migration files are not compatibility commitments. Corrective M6 work must not preserve rejected schema merely because an earlier development migration created it. Product meaning is governed by `docs/OWNER_INTENT.md` and the reconciled `docs/SPEC.md`, not by historical acceptance wording.

## M6 reconciliation state

M6 implementation is not automatically reverted. Its current parts are classified against Owner Intent before further dependency is built on them.

### ALIGNED

- multiple independently meaningful candidature sources and preservation of raw source material;
- sparse/incomplete candidature storage and persistence;
- progressive UI composition as a technique for avoiding one enormous static form;
- reusable career context kept separate from factual canonical-profile evidence;
- concepts/documents integration, application-service mutations, sandboxed renderer, typed preload/IPC, backup/reopen behavior, and the SQLite migration mechanism;
- Focus as a projection rather than duplicate persisted candidature state.

### USEFUL BUT OVER-PRIVILEGED

- the current working-brief values (fit, evidence, risks, strategy, context, pitch, questions, recruiter preparation) are legitimate information, but M6 treated their fixed grouping as a preferred preparation model;
- priority and status/lifecycle are allowed optional information, but current M6 requirements gave them excessive importance in list/Focus/acceptance;
- recruiter-preparation information is useful, but a dedicated preparation stage is not the canonical user workflow;
- the seven current career-context values are useful reusable information, but their current fixed catalogue does not define all future professional/context information.

### UNVALIDATED

- the current closed working-brief/source-kind catalogue as a long-term product information model;
- the current fixed Focus defaults as universal presentation importance;
- candidature identification rules that privilege company/role fallbacks without user/configuration alternatives;
- any assumption that the current single AI connection or existing setup surface completes the intended configuration model.

### CONTRADICTORY

- treating `next action` as a privileged Focus/list requirement or required maintenance loop;
- a fixed Focus hierarchy with no user control over visibility, order, and relative prominence;
- the sequential packaged M6 acceptance journey that requires manual status/priority/next-action, evaluation/strategy, pitch/questions, and recruiter-preparation entry before Focus is considered useful;
- language that makes M6 a primarily manual-entry workflow rather than one human-operable path among manual, direct-AI, and bounded external-AI ways to work with the same information.

Contradictory implementation/tests are remediation input for the next properly defined capability Mission. The recovery did not edit development migrations; that is historical fact, not a compatibility requirement for corrective M6 work.

## Next lifecycle step

After the product-authority recovery merges, derive exactly one next Mission from:

```text
docs/OWNER_INTENT.md
+
docs/SPEC.md
+
actual current implementation and evidence
```

Only that Mission may then be decomposed. No speculative successor-Mission sequence is authoritative.
