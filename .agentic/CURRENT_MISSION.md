# Current mission — PLAN[3] architecture, readability and dependency health

Current explicit Product Owner instruction remains higher authority. PLAN[0], PLAN[1] and PLAN[2] are closed. PLAN[4] document/LaTeX redesign and PLAN[5] UX redesign remain out of scope.

## Outcome

Make AAAAT easier for one human developer plus AI to read, modify and reason about without changing production behavior.

- make Electron desktop startup and IPC capability registration explicit from one composition root;
- centralize the repeated trusted-renderer check and remembered-workspace resolution used by feature IPC modules while preserving the sandbox/main-frame/no-arbitrary-workspace boundary;
- move core desktop IPC registration out of `main.ts` so startup remains focused on Electron lifecycle, session protection and window creation;
- make materially compressed current code, especially `document-domain-service.ts`, ordinary readable TypeScript without redesigning document semantics;
- inspect large renderer coordinators and extract only genuinely cohesive low-coupling helpers or subviews;
- perform fresh dependency-health triage from the current branch, distinguishing shipped/runtime exposure from build/test tooling and changing dependencies only when current evidence justifies it;
- correct clear architecture/documentation drift encountered during the pass without pulling later product redesign forward.

Prefer direct functions, explicit composition and small purposeful modules. Do not add repositories, DI containers, routers, registries, event buses, plugin frameworks, migration machinery or compatibility layers for architectural aesthetics.

## Verification

Use focused checks while changing code and finish with `npm run verify`. If final changes affect desktop startup/IPC composition, run the surviving Windows packaged material journeys on the exact final head and record the evidence in the PR.

Stop after the branch is pushed and one PR against `main` is open with exact evidence. Do not merge and do not declare PLAN[3] complete.
