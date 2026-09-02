# ADR 0002 — M0 desktop stack and proof obligations

## Context

AAAAT requires a cross-platform desktop UI, strong renderer privilege separation, local SQLite ownership, current TypeScript/React product engineering, and native packaging. Electron Forge's Vite plugin is experimental, and Electron's embedded `node:sqlite` API remains release-candidate stability. Those risks must be proved rather than hidden.

## Decision

M0 uses exact mutually compatible stable pins in the approved stack:

- Electron 44.1.1;
- React and React DOM 19.2.8;
- TypeScript 6.0.3 strict mode;
- Vite 8.2.2 and React plugin 6.1.1;
- Electron Forge packages 7.11.2;
- `@electron/fuses` 1.8.0;
- Zod 4.5.4;
- Vitest 4.1.11 and React Testing Library 16.3.3.

Node 24.20.0 and its bundled npm 11.19.0 are the development/CI toolchain. Electron 44.1.1 supplies Node 24.19.0 to the packaged application.

M0 must prove development startup, production packaging, packaged launch, the sandboxed preload boundary, and file-backed `node:sqlite` migrate/write/read/close/reopen behavior on native Windows, macOS, and Linux runners.

## Consequences

- Direct dependencies and the lockfile are pinned; no opportunistic upgrades occur in feature work.
- `node:sqlite` stays behind one small main-process adapter.
- Forge/Vite startup and packaging are acceptance gates, not assumed compatibility.
- macOS packaging targets the Electron 44 baseline (macOS 13 or later).
- Signing, notarization, auto-update, and final installers remain M5 concerns.

If Forge/Vite or `node:sqlite` fails, the exact evidence triggers a Class C review, Skeptical Simplifier review, and a new ADR. Forge 8 alpha or a native SQLite addon is not adopted silently.

## Alternatives rejected

- Forge 8 alpha: violates the stable-version requirement.
- Native SQLite addon by default: adds ABI and packaging complexity before the built-in boundary is disproven.
- Tauri or another desktop runtime: reopens an owner-approved Class D decision.
- V1 Python/wx continuation: conflicts with the approved clean restart.
