# AAAAT Agent Instructions

AGENTS.md is the entry point. Before changing AAAAT, read: docs/OWNER_INTENT.md; docs/SPEC.md; .agentic/CONSTITUTION.md; .agentic/CURRENT_MISSION.md; .agentic/ROUTING.md; .agentic/DECISION_POLICY.md; .agentic/REVIEW_POLICY.md; docs/engineering/EXECUTION.md when host, runtime, TeX, or handoff behavior matters; then the active GitHub Issue and relevant accepted ADRs.

For product meaning: current Product Owner instruction → OWNER_INTENT → SPEC → Mission/Issue → tests → implementation. For technical architecture inside established product meaning: SPEC → accepted ADRs → contracts → Issue → tests → implementation. Historical v1 material and superseded Issues/PRs are evidence only.

AAAAT has no real-user v2 compatibility baseline. Development databases, fixtures, and earlier development migrations are not user commitments; correct obsolete development schema directly when current product meaning requires it.

Build only current authority. A Mission selects one bounded capability from the accepted masterplan; it does not define a user workflow or complete the product. Once the scope follows established product meaning, orchestrators may activate the next bounded capability without routine owner approval.

AAAAT remains human-operable without AI. Manual, AAAAT-assisted, and bounded external-AI paths use the same ordinary user-owned information. Generated LaTeX is portable and uses a LaTeX2e API with expl3 internals through pdfLaTeX/pdfTeX. Durable mutations use application services. The Electron renderer stays sandboxed and unprivileged.

AAAAT protects its own local state through explicit domain data, typed validation, narrow application-service mutation paths, bounded integrations, and process/renderer privilege boundaries. External hosts receive only named demonstrated operations, never generic CRUD, browsing/listing/search/query, arbitrary durable IDs, or a scraping surface. Temporary references exist only within their validated operation scope.

Purpose-specific disclosure of permitted career context and AI-visible CV tags/notes is allowed so the chosen assistant can judge suitability; AAAAT does not rank CVs. Further permitted content, contributions and production use named operations. This does not grant candidature-corpus access or generic profile/document browsing. Setup describes actual host access honestly.

AAAAT does not own external model reasoning, prompt interpretation, provider internals, network, or research behavior. Provider output is ordinary operation input validated through normal contracts. Do not add AI firewalls, prompt-injection systems, generic model-security/policy engines, or universal approval queues where the ordinary local boundary is sufficient. Privacy projection controls disclosure and may expose, omit, or locally replace values while authoritative literals remain local. Sources are explicit retained objects and enter an operation only when its purpose deliberately scopes them.

Before completion: run impact-appropriate verification selected by .github/workflows/verify.yml and Issue checks; obtain independent review; invoke Simplifier for material new complexity; resolve Class A/B/C autonomously after Product Meaning check; escalate unresolved product meaning and Class D only. Do not commit temporary prompts, reports, handoffs, acceptance ledgers, review transcripts, personal data, or private workspace material.

Context must survive the conversation and PR. Before a handoff or completion, preserve accepted product meaning and essential examples in OWNER_INTENT, architecture/rationale and required destinations in SPEC or the relevant ADR, and unresolved findings/verification gaps plus the next bounded outcome in CURRENT_MISSION. GitHub comments supplement these files; they must not be the sole record of a decision, correction, blocker or required capability. Update existing sections instead of adding transcripts, duplicate plans or a new ledger. Do not silently drop unfinished requirements when replacing a Mission. Unresolved interpretation is recorded as unresolved, not promoted into owner authority.
