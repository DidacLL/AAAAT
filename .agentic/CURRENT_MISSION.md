# Current mission — PLAN[0] integrated baseline acceptance

This file is derived coordination state. Current explicit Product Owner instruction remains higher authority.

## Outcome

Finish the existing integrated candidate in PR #319 on `product/dogfood-workspace-ai-context` and remove known first-class foundation contradictions without reopening architecture, adding features, or pulling later PLAN work into this run.

PLAN[0] is the accepted integrated baseline: current UX/domain behavior stays intact, foundation truth is coherent, and deferred cleanup is explicitly left for later PLANs.

## Bounded corrections in this run

1. Remove the accidental `720×600` BrowserWindow product/minimum assumption. Do not replace it with another arbitrary fixed minimum. Concrete dimensions may remain as representative verification samples.
2. Make `src/main/schema.sql` the sole current workspace structural truth. Workspace validation must derive its structural expectation from that schema while retaining SQLite integrity checking, workspace identity metadata, required seed invariants, and clear rejection of incompatible/corrupt workspaces. No migrations or compatibility machinery.
3. Fix only immediately adjacent, clearly obsolete remnants exposed by those changes. Do not start PLAN[1] test redesign or PLAN[3] architecture cleanup.
4. Keep PR #319 as the integrated candidate and keep this mission/PR coordination aligned with PLAN[0].

## Verification boundary

During implementation, prefer typecheck/lint and focused affected tests. At the run boundary require the current logical verification gate plus affected packaged-runtime journeys. Produce a fresh Windows packaged candidate because Windows is the Product Owner acceptance platform for PR #319. Do not spend development cycles on Linux/macOS cross-OS verification yet.

CI/package success is engineering evidence, not Product Owner acceptance and not merge authority.

## Acceptance gate

After the bounded corrections and fresh Windows evidence are green, the remaining gate should be Product Owner natural-use acceptance of the integrated product unless a genuine unresolved trade-off is discovered.

Do not merge PR #319 merely because CI is green. PLAN[0] is complete only when the integrated baseline is accepted on `main`, no known first-class integrity contradiction remains, and later work is explicitly separated into later PLANs.
