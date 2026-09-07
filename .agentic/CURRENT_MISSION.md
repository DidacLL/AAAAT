# Active Mission — Explicit external CV render authority

**Active:** [Issue #200](https://github.com/DidacLL/AAAAT/issues/200) on `feature/external-cv-render`, based on integrated deliberate CV content disclosure `ab75ce0c4778b9a87c80ca9ce90e343496198e92`.

## Outcome

Complete the missing local-production part of the required external-assistant destination by allowing a configured external host to request AAAAT's normal local PDF render for the one content-selected CV, but only after the user grants a separate explicit render authorization.

## Boundaries

Content disclosure does not imply production authority. Render authorization is CV-only, may exist only on the currently content-selected CV, starts disabled, and is revoked automatically whenever that CV loses content-selection authority. Cover letters cannot receive it.

The renderer exposes only the existing bounded CV-access surface plus a distinct `updateRender` intention. The Documents UI requires separate confirmation before allowing external rendering and explains that the host can request the normal local render without gaining document selection, path, command, engine, filesystem or process authority.

The external `cv_render` operation accepts no data arguments. Without a content-selected and render-authorized CV it returns null. With authorization it delegates to the existing `renderDocument` service and returns only `{ rendered: true }`; it does not expose document identity, paths, TeX/PDF bytes, logs or environment details.

Do not add generic external action/permission infrastructure, document selection/search input, arbitrary render controls, output-path control, cover-letter production, provider/research work, compatibility migration machinery, dependencies, workflow machinery or unrelated scope.

This is Class C because it adds durable external production authority and extends the demonstrated MCP host surface. ADR 0024 records the disclosure-vs-production authority boundary. Obtain one independent Reviewer verdict before integration; invoke Skeptical Simplifier only if a generic permission/action abstraction, compatibility layer, dependency or material framework appears.

## Evidence and continuation

Issue #198 / PR #199 is integrated at `ab75ce0c4778b9a87c80ca9ce90e343496198e92`. Verify #451 passed typecheck, lint, 69 passed test files / 202 active tests, Windows/macOS/Linux packaged release/runtime lanes, Windows demonstrated VS Code host-contract installation and the aggregate Verification gate; LaTeX portability was correctly skipped.

Next: finish Issue #200, run focused authority/API/UI/MCP/setup tests plus impact-selected Verify, correct concrete findings, obtain independent review, and integrate when accepted.
