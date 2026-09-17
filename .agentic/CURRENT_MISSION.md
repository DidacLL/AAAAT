# Current mission — PLAN[0] integrated baseline acceptance

This file is derived coordination state. Current explicit Product Owner instruction remains higher authority.

## Outcome

Finish the existing integrated candidate in PR #319 on `product/dogfood-workspace-ai-context` and remove known first-class foundation contradictions without reopening architecture, adding features, or pulling later PLAN work into this run.

PLAN[0] is the accepted integrated baseline: current UX/domain behavior stays intact, foundation truth is coherent, and deferred cleanup is explicitly left for later PLANs.

## Bounded corrections

1. The accidental `720×600` BrowserWindow product/minimum assumption is removed. No replacement arbitrary product minimum is introduced; concrete dimensions remain only as representative verification samples where useful.
2. `src/main/schema.sql` is the sole current workspace structural truth. Workspace validation derives structural expectations from that schema while retaining SQLite integrity checking, workspace identity metadata, required seed invariants, and clear rejection of incompatible/corrupt workspaces. No migrations or compatibility machinery are introduced.
3. Immediately adjacent obsolete recovery/test remnants exposed by this work are corrected. PLAN[1] test redesign and PLAN[3] architecture cleanup remain deferred.
4. PR #319 remains the integrated candidate and must not merge merely because engineering checks are green.

## Verification model

Development pushes stay cheap. The PR workflow performs only lightweight typechecking for code-bearing changes; workflow/docs-only changes do not trigger it. Windows packaging is not run on ordinary development pushes.

The run boundary is explicit: moving the dedicated `candidate/windows` ref to the final PR head runs one Windows job containing the full logical verification (`typecheck`, lint, Vitest), packaging, the affected packaged workspace recovery journey, the packaged host-neutral application/document journey, metadata/checksum collection, and candidate upload.

Linux/macOS cross-OS verification is intentionally deferred until later finalization work.

CI/package success is engineering evidence, not Product Owner acceptance and not merge authority.

## Acceptance gate

After the fresh Windows candidate is green, the remaining PLAN[0] gate is Product Owner natural-use acceptance of the integrated product unless a genuine unresolved trade-off is discovered.

Do not merge PR #319 merely because CI is green. PLAN[0] is complete only when the integrated baseline is accepted on `main`, no known first-class integrity contradiction remains, and later work is explicitly separated into later PLANs.
