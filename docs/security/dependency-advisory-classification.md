# Dependency advisory classification

PLAN[3] refreshed this evidence on September 21, 2026. The purpose is to distinguish shipped application/runtime exposure from development, build, packaging and test tooling before deciding whether a dependency change is justified.

## Reproducible npm evidence

GitHub Actions run `35545536856`, job `106170639180`, executed on Ubuntu 24.04 with Node `24.20.0` and npm `11.19.0` against branch commit `6b72ddbda53fed5d9887d05692ba06af3f2ff019`. That commit already contains the Electron `44.4.3` update.

The requested commands reported:

- `npm audit --json`: 27 package findings — 3 low, 23 high and 1 critical; exit 1.
- `npm audit --omit=dev --json`: zero findings at every severity; exit 0.
- `npm outdated --json`: exit 1 because newer packages exist; the production entries are React/React DOM `19.2.8 → 19.3.0` and Zod `4.5.4 → 4.6.5`. The MCP server SDK is not reported outdated.
- `npm ls --depth=0 --json`: exit 0 and confirms the pinned top-level tree, including Electron `44.4.3`, Forge `7.11.2`, React/React DOM `19.2.8`, Zod `4.5.4` and `@modelcontextprotocol/server` `2.0.0`.

Therefore none of the npm-audited high or critical findings is reachable through AAAAT's declared production dependency graph.

## Direct production dependency review

AAAAT retains four direct production dependencies and all four are used:

| Dependency | Current evidence | PLAN[3] decision |
| --- | --- | --- |
| `@modelcontextprotocol/server@2.0.0` | Used by `src/main/mcp-server.ts`; not reported by `npm outdated`; no production audit finding. | Keep. |
| `react@19.2.8` | Used throughout the renderer; `19.3.0` is available; no production audit finding. | Keep. No current behavior/security need justifies renderer churn. |
| `react-dom@19.2.8` | Used by the renderer entry point; `19.3.0` is available and remains paired with React; no production audit finding. | Keep with React. |
| `zod@4.5.4` | Used across shared contracts and main-process validation; `4.6.5` is available; no production audit finding. | Keep. No current defect or advisory makes the update material. |

No direct production dependency is unused, so PLAN[3] removes none.

## High and critical findings

Every high/critical package node from the full audit belongs to Electron Forge packaging/build tooling rather than the declared production dependency graph:

| Package node | Severity | Exposure classification |
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
| `@electron/node-gyp` | high | development/build only, via rebuild tooling |
| `@electron/packager` | high | development/build only |
| `@electron/rebuild` | high | development/build only |
| `cacache` | high | development/build only |
| `extract-zip` | high | development/build only |
| `make-fetch-happen` | high | development/build only |
| `tar` | critical | development/build only |
| `tmp` | high | development/build only |

The three low-severity nodes (`@inquirer/editor`, `@inquirer/prompts` and `external-editor`) are likewise Forge CLI/build-time dependencies.

`npm explain` establishes the relevant critical path: Forge `7.11.2` brings `@electron/rebuild@3.7.2`, which directly requires `tar@^6.0.5` and also reaches `tar@6.2.1` through Electron's node-gyp tooling. `tmp@0.0.33` is likewise development-only through Forge CLI prompting. The full audit proposes Forge `6.4.2` as the fix for these nodes and marks it semver-major; that is a downgrade from the current `7.11.2` toolchain, not a safe compatible maintenance update. `npm outdated` does not identify a newer stable Forge line to take.

This classification does not treat build-tool vulnerabilities as harmless. They remain visible because they affect dependency installation/build/package environments. It does distinguish them from vulnerabilities present in the shipped application's declared production graph.

## Electron runtime review

Electron is a `devDependency` because Forge supplies the runtime during packaging, so the production-only npm audit does not classify Electron runtime freshness by itself.

PLAN[3] updates Electron from `44.1.1` to `44.4.3`. Electron's release service lists `44.4.3` as the current stable 44 release on September 18, 2026. Intervening 44.x releases include a fix for a crash after a large number of renderer IPC messages, Windows fixes, object-lifetime fixes and upstream Chromium/V8 updates. The full npm audit contains no vulnerability node for the `electron` package.

Official references:

- https://releases.electronjs.org/?channel=stable
- https://releases.electronjs.org/release/v44.2.0
- https://releases.electronjs.org/release/v44.4.0
- https://releases.electronjs.org/pr/53968
- https://releases.electronjs.org/schedule

Because this changes the packaged runtime, PLAN[3] requires final packaged Windows verification on the exact final branch head.

## Decision

One dependency change is justified by current evidence: the compatible Electron 44 patch update to `44.4.3`.

No other dependency is changed merely to make `npm outdated` or the full audit count smaller.

- Shipped declared production graph: zero npm audit findings.
- Electron runtime: updated within major 44 to the current stable patch.
- High/critical npm findings: confined to development/build/packaging tooling.
- Current stable Forge: no compatible update is offered by `npm outdated`; npm's audit remediation proposes an incompatible downgrade.
- `npm audit fix --force`: not used.
- React/React DOM/Zod updates: deliberately deferred because no current defect, advisory or maintenance reduction justifies their churn.
