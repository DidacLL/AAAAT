# AAAAT Agent Instructions

Before working:

1. Read `docs/OWNER_INTENT.md`.
2. Read `docs/SPEC.md`.
3. Read `.agentic/CONSTITUTION.md`.
4. Read `.agentic/CURRENT_MISSION.md`.
5. Read `.agentic/ROUTING.md`.
6. Read `.agentic/DECISION_POLICY.md`.
7. Read `.agentic/REVIEW_POLICY.md`.
8. Read `docs/engineering/EXECUTION.md` when execution behavior matters.
9. Read the relevant GitHub Issue and relevant accepted ADRs.

For product meaning, authority is:

`current Product Owner instruction → docs/OWNER_INTENT.md → docs/SPEC.md → CURRENT_MISSION / GitHub Issue → tests → implementation`

Inside established product meaning, technical architecture is:

`docs/SPEC.md → accepted ADRs → contracts → GitHub Issue → tests → implementation`

Accepted ADRs remain authoritative for technical architecture only where they do not conflict with higher product authority. Historical v1 material and superseded Issues/PRs are research evidence only.

AAAAT has not yet established a real-user v2 data-compatibility baseline. Development databases, fixtures, and already-merged development migrations are not user compatibility commitments. Do not preserve rejected or obsolete schema merely because earlier development code created it. Git history preserves engineering evidence. Until the Product Owner explicitly establishes a real-use/release data baseline, correct the development schema directly when current product meaning requires it; do not add compatibility machinery for nonexistent users.

Build only what current authority requires. Do not introduce speculative future infrastructure. AAAAT remains fully human-operable without AI; manual, AAAAT-assisted AI, and bounded external-AI paths work with the same user-owned information. Generated LaTeX remains portable. Durable mutations use application services. The Electron renderer remains sandboxed and unprivileged.

AAAAT security is structural: protect authoritative local state with simple explicit domain/data structures, narrow application-service mutation paths, typed validation, bounded capabilities, and the existing process/renderer privilege boundaries. AAAAT does not own or secure an external AI model's reasoning, prompt interpretation, provider internals, network, or research behavior. Treat AI/provider output as untrusted operation-scoped input and validate it through normal domain contracts; do not invent AI-firewall, prompt-injection, token-security, generic policy, or mandatory approval machinery where bounded authority already prevents dangerous access. Privacy projection controls disclosure to an operation; it is not the authority boundary.

Before completion:

- run the impact-appropriate verification selected by `.github/workflows/verify.yml`;
- run Issue-specific checks;
- obtain independent review;
- invoke the Simplifier for material new complexity;
- resolve architectural Class A/B/C decisions autonomously only after the Product Meaning check passes;
- escalate unresolved product meaning and Class D decisions to the Product Owner.

Do not commit temporary prompts, sprint reports, handoffs, acceptance ledgers, generated review transcripts, personal data, or private workspace material.
