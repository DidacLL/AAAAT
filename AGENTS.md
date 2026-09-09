# AAAAT agent instructions

## Start here

Before changing AAAAT, recover the relevant truth in this order:

1. the current explicit Product Owner instruction;
2. [PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md);
3. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md), only when interpretation or rationale helps;
4. [OWNER_DEVELOPMENT_PRINCIPLES.md](OWNER_DEVELOPMENT_PRINCIPLES.md);
5. [docs/SPEC.md](docs/SPEC.md);
6. [.agentic/CURRENT_MISSION.md](.agentic/CURRENT_MISSION.md), then the linked live GitHub Issue, branch, PR, and CI state;
7. relevant accepted ADRs, contracts, tests, and implementation evidence.

Product authority is:

```text
current explicit Product Owner instruction
→ PRODUCT_DEFINITION.md
→ derived SPEC / current Mission / Issue
→ tests
→ implementation
```

Product Context and `docs/owner-source/` explain or preserve provenance. They never create requirements. A Mission, Issue, ADR, test, migration, existing implementation, historical name, or successful CI run never creates product meaning by itself.

After product meaning is established, use the derived technical order:

```text
SPEC → accepted ADRs → contracts → Issue → tests → implementation
```

If the Product Definition does not resolve a consequential product question, state the concrete uncertainty and ask the Product Owner once. Do not ask the owner to repeat meaning already preserved in this repository.

## Work autonomously and proportionally

Take the smallest coherent step that advances a real product outcome. Routine implementation, review, testing, and integration proceed without owner approval once their product trace is clear. Escalate only genuine unresolved meaning or a consequential trade-off that cannot be resolved from the authority record.

Tests protect user-visible behavior, domain and security boundaries, local ownership, portable artifacts, and meaningful failure semantics. Do not let fixtures, exact interaction order, internal identity, token syntax, or an old workflow silently become product requirements.

Keep proven technical boundaries where they remain useful: a local authoritative workspace, typed/domain validation, normal application-service mutation paths, a sandboxed unprivileged renderer, optional bounded AI operations, and user-owned portable document output. Do not add a framework, generic CRUD/query surface, policy engine, workflow/agent platform, requirements database, or compatibility machinery without demonstrated need.

AAAAT has no established real-use v2 compatibility baseline. Until the Product Owner explicitly establishes one for actual user data, development databases, fixtures, and development-era schema can be corrected directly when current product meaning requires it. A dormant audit record is not a request to establish a baseline.

## Execution and evidence

Use the GitHub-capable agent for normal bounded implementation, documentation, Issue/PR coordination, CI inspection, and independent review. Use scarce local/Codex work only when actual shell, Electron, package, browser/visual, TeX/PDF, rendering, filesystem/process, or environment evidence is necessary. The Product Owner is an intentional transport and product reviewer, not routine QA.

Choose verification by changed behavior and evidence premises, not by commit SHA. Reuse successful evidence when later changes cannot affect the behavior, platform path, fixture contract, environment assumption, or other premise it proved. Run new local, runtime, visual, package, or TeX checks only for affected surfaces or a concrete evidence gap. Follow the selected lanes in `.github/workflows/verify.yml`.

Meaningful handoffs and completions begin with:

```text
Now: what works or changed
Next: one bounded outcome
Owner attention: none, or one concrete question
Evidence: Issue/PR and verification conclusion
```

Keep lasting product meaning in Product Definition, technical rationale in SPEC or the relevant ADR, and unresolved execution state in Current Mission. GitHub is the live coordination record. Do not commit task transcripts, prompts, personal data, acceptance ledgers, or duplicate status systems.

## Third-party agent tooling

No `rsc` harness is installed for AAAAT. Do not add `.rsc/`, `01-TOOLS/`, `02-DOCS/`, generated third-party hooks, or a parallel specification/decision archive. A future tool may assist only if it remains subordinate to this authority sequence and does not create a competing source of truth.
