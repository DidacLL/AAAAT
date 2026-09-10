# ADR 0015 — Owner-approved recovery boundaries

- Status: Accepted by direct Product Owner instruction
- Date: 2026-09-05
- Decision class: C
- Issue: [#158](https://github.com/DidacLL/AAAAT/issues/158)
- Supersedes: ADR 0013's outbound stable-field/choice-ID requirement; any interpretation of ADRs 0006–0008 requiring external/provider contracts to reuse internal identifier-bearing contracts. All unrelated decisions remain in force.

## Decision

Keep the current Electron, React, TypeScript, SQLite and application-service architecture. Separate external/provider wire contracts from internal renderer/service contracts. Durable identifiers stay local. Where an operation requires a round trip, expose temporary references resolved only within that operation's validated scope. Receiving data grants no additional mutation capability. Use ordinary validation and conflict behavior, without a generic policy framework or approval queue.

ADR 0014's structural boundary remains in force. Purpose-specific disclosure of permitted career preferences and AI-visible CV tags/notes is allowed for bounded assistance; AAAAT does not rank opportunities or manage a career workflow. Further permitted document content, contributions and production actions use named operations. This grants neither candidature-corpus access nor a generic entity browser.

The owner fixes document production to a LaTeX2e public API, expl3 internals and pdfTeX through pdfLaTeX. This supersedes the previous SPEC's mandatory LuaLaTeX/XeLaTeX extension/matrix requirement. A TypeScript feeder owns generated data; editable blueprints and modified package sources remain user-owned. Keep local async process execution, portability and service boundaries. Detailed blueprint and language/font design remains the agreed later owner collaboration.

There is no real-use v2 data baseline. Correct obsolete development schema/contracts directly when needed; do not build migration or wire-compatibility machinery for nonexistent users. Once an explicit real-use baseline exists, preserve actual user data through appropriate migrations.

## Consequences and evidence

Tests that assert durable external IDs must change with the rejected contract. Verify disclosure, operation scope, conflicts and local restoration, not incidental placeholder syntax. Setup describes actual host access, including workspace paths in generated configuration and the separate trust granted to shell-capable hosts.

`PRODUCT_DEFINITION.md` is the normative product path; the derived SPEC records technical architecture and this ADR records a technical correction. Future capability selection follows the authority ladder rather than a historical checkpoint. Independent review and impact-selected runtime/TeX evidence establish implementation completion; this decision alone does not claim capabilities are delivered.
