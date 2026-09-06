# Active Mission — Immutable application artifacts

**Active:** [Issue #163](https://github.com/DidacLL/AAAAT/issues/163) on `feature/application-artifact-capture`, based on integrated Focus retrieval `3f1d85a997b3f20de10641d5766737e6ef160d00`.

## Outcome

Complete the bounded SPEC requirement that a candidature may retain the actual CV or cover-letter material used for an opportunity. A retained artifact is an immutable snapshot of the working document project and rendered PDF; later working-document edits or renders must not change it.

## Boundaries

Keep artifacts as an explicit domain concept associated with a candidature and originating working document. Reuse the existing document project/rendering path and candidature-document association. No lifecycle/workflow engine, cloud storage, generic blob/versioning layer, artifact marketplace, scheduler, AI requirement, LaTeX redesign, generic repository or new dependency.

AAAAT still has no real-user v2 compatibility baseline. This Mission does not introduce migration-compatibility machinery: the current development schema may be corrected directly under Owner Intent and SPEC.

Human operation must remain complete through the desktop UI. Durable capture goes through an explicit application service and bounded typed preload/IPC intentions.

Expected decision class is B unless implementation introduces a materially broader persistence, filesystem or security abstraction.

## Evidence and continuation

Issue #161 / PR #162 is integrated at `3f1d85a997b3f20de10641d5766737e6ef160d00`; Verify #398 passed Fast plus Windows/macOS/Linux packaged runtime.

Next: finish Issue #163 end to end, run impact-selected Verify once on the complete candidate, then obtain one independent Reviewer verdict before integration. Invoke Simplifier only if material new complexity appears.
