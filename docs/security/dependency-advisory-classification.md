# Dependency advisory classification

M5 Issue #118 records the dependency-security review for the release candidate. The purpose is to distinguish shipped application/runtime exposure from development, build, packaging, and test tooling before considering dependency changes.

## Reproducible npm evidence

GitHub Actions run `33787318359`, job `100755116865`, executed on Ubuntu 24.04 with Node `24.20.0` and npm `11.19.0` against PR #119 head `79d95cd255ec91ff469fff268cdaf7027d3443fb`.

The full command `npm audit --json` reported:

- 27 package findings total;
- 3 low;
- 23 high;
- 1 critical.

The production-only command `npm audit --omit=dev --json` reported an empty `vulnerabilities` object and zero findings at every severity. npm classified the installed tree as 7 production dependencies and 727 development dependencies, with optional/peer entries counted separately.

Therefore none of the npm-audited high or critical findings is reachable through AAAAT's declared production dependency graph.

## High and critical findings

Every high/critical package node from the full audit belongs to Electron Forge packaging/build tooling rather than the shipped application dependency graph:

| Package node | Full-audit severity | Exposure classification |
| --- | --- | --- |
| `@electron-forge/cli` | high | development/build only |
| `@electron-forge/core` | high | development/build only |
| `@electron-forge/core-utils` | high | development/build only |
| `@electron-forge/maker-base` | high | development/build only |
| `@electron-forge/maker-deb` | high | development/build only |
| `@electron-forge/maker-zip` | high | development/build only |
| `@electron-forge/plugin-base` | high | development/build only |
| `@electron-forge/plugin-fuses` | high | development/build only |
| `@electron-forge/plugin-vite` | high | development/build only |
| `@electron-forge/publisher-base` | high | development/build only |
| `@electron-forge/shared-types` | high | development/build only |
| `@electron-forge/template-base` | high | development/build only |
| `@electron-forge/template-vite` | high | development/build only |
| `@electron-forge/template-vite-typescript` | high | development/build only |
| `@electron-forge/template-webpack` | high | development/build only |
| `@electron-forge/template-webpack-typescript` | high | development/build only |
| `@electron/node-gyp` | high | development/build only, via native rebuild tooling |
| `@electron/packager` | high | development/build only, used while constructing artifacts |
| `@electron/rebuild` | high | development/build only |
| `cacache` | high | development/build only, transitive through rebuild tooling |
| `extract-zip` | high | development/build only, transitive through `@electron/packager` |
| `make-fetch-happen` | high | development/build only, transitive through Electron node-gyp tooling |
| `tar` | critical | development/build only, transitive through Electron rebuild/node-gyp tooling |
| `tmp` | high | development/build only, transitive through Forge CLI prompting tooling |

The three low-severity nodes (`@inquirer/editor`, `@inquirer/prompts`, and `external-editor`) are likewise Forge CLI/build-time dependencies.

This classification does not claim that build-tool vulnerabilities are harmless. They remain visible and should continue to be reassessed when Forge releases a compatible supported line that removes them. It does mean they are not equivalent to a vulnerability shipped in AAAAT's application dependency graph, and they do not justify forcing an incompatible downgrade or broad dependency rewrite during M5.

## Electron runtime check

Electron is declared under `devDependencies` because Forge supplies the runtime during packaging, so the production-only npm audit cannot by itself classify Electron runtime risk.

AAAAT pins Electron `44.1.1`. On September 3, 2026, the official Electron release service identifies `44.1.1` as **Latest Stable**, released September 1, 2026. The official release schedule lists Electron 44 end-of-life as March 2, 2027, and Electron's support policy covers the latest three stable major lines.

The full npm audit above contains no vulnerability node for the `electron` package itself. Combined with the official current-release/support status, there is no evidence in this M5 review that warrants changing the pinned Electron runtime.

Official references:

- https://releases.electronjs.org/release/v44.1.1
- https://releases.electronjs.org/schedule
- https://www.electronjs.org/docs/latest/tutorial/electron-timelines

## Decision

No dependency change is justified by the captured evidence.

- Shipped npm production graph: zero audit findings.
- Electron runtime: current latest stable and supported release line; no `electron` audit finding.
- High/critical npm findings: confined to development/build/packaging tooling.
- `npm audit fix --force`: explicitly not used.
- Forge/Electron major changes: not introduced merely to reduce a build-tool audit count.

The remaining build-tool advisories are intentionally documented rather than hidden or converted into a misleading release-runtime vulnerability count.
