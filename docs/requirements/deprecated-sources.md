# Deprecated requirements and planning sources

Status: authoritative deprecation registry for AAAAT v1.

Current authority: [`v1-authoritative-requirements.md`](v1-authoritative-requirements.md).

The sources below remain available as project history and may contain useful lessons or reusable implementation details. They must not be used as current product requirements, release acceptance criteria or architectural authority.

## Deprecated seed and early requirement material

| Source | Status | Reason |
|---|---|---|
| Original AutoApplicationAgentAgnosticTracker/Codex planning seed prompt | Deprecated | Proposed browser dashboard, REST, runtime modes and broad passive surfaces before wx and bounded-authority corrections. |
| `docs/PO/BasicAppRequirements.md` | Deprecated | Early vocabulary and field/UI ideas; predates the final runtime and communication requirements. |
| `docs/product-owner-original-intent.md` | Deprecated | Historical intent only; useful for product identity but not implementation decisions. |
| Generated requirement summaries derived from the seed | Deprecated | Secondary interpretations may encode drift and cannot override direct maintainer corrections. |

## Superseded runtime and agent plans

| Source | Status | Reusable lessons only |
|---|---|---|
| Browser/server/static-export plans | Rejected for v1 | Local-first concerns, but not the browser runtime or mandatory HTTP architecture. |
| Runtime-split HTTP agent plans | Rejected as product architecture | Opaque task handles, bounded context and no entity-ID authority. |
| Broad REST or MCP tool catalogues | Rejected | Schema vocabulary only where it maps exactly to bounded tasks. |
| Provider SDK or OpenAI-compatible client proposals | Rejected | None as a required core integration path. |

## Abandoned PRs

### PR #40 — provider-agnostic LLM protocol

Status: closed without merge and deprecated as a requirements source.

Useful lessons:

- task packets are the invariant;
- external runners own provider-specific behavior;
- command and manual dispatch can share validation;
- local artifact rendering remains AAAAT-owned.

Rejected drift:

- accumulated protocol, persistence, orchestration and UI rewrites;
- copy/paste treated as an adequate main workflow;
- implementation structure that obscured the complete product lifecycle.

### PR #41 — intake and assistance rebuild

Status: closed without merge and deprecated as a requirements source.

Useful lessons:

- offer-first intake;
- candidature-scoped assistance;
- non-blocking desktop task execution;
- one task registry rather than duplicated task definitions.

Rejected drift:

- contract violations;
- runtime regressions;
- changes that did not preserve accepted PR #37 behavior.

### PR #42 — clean intake assistance rebuild

Status: unmerged draft and deprecated as a requirements source.

Useful lessons:

- transparent configuration;
- bounded user-owned command execution;
- shared assistance projection in wx;
- background worker and progress concepts;
- automatic task planning from source material.

Insufficient for release:

- no complete universal communication layer;
- no standard-user local-model onboarding;
- no real Ollama and independent llama.cpp proof;
- no adequate browser-only automatic or grouped-bundle path;
- incomplete profile and end-to-end release demonstration.

## PR #45 release-engineering material

PR #45 remains the active draft implementation branch. Its packaging, migration, backup, installation, supported-Python and wx work should normally be preserved.

Any previous statement that PR #45 was release-ready is deprecated. Packaging success and green legacy tests do not establish product completion.

## Interpretation rule

When reading historical material:

1. extract concrete lessons;
2. verify them against the authoritative requirements;
3. reuse code only when it supports the current contract;
4. change tests and documents that encode superseded assumptions;
5. never infer a requirement merely because it appeared in an abandoned implementation.
