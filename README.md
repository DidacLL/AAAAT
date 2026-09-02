# AAAAT v2

AAAAT is a private, local-first career workspace for candidature management and portable CV and cover-letter creation. It remains fully useful without AI, may use configured AI through privacy-projected validated operations, and can later expose bounded capabilities to external tools.

AAAAT v2 is a clean restart. The Python/wxPython v1 implementation remains available through Git history and the `v1-prototype-final` tag; it is research evidence, not a compatibility target.

## Current mission

M2 - Candidature Workspace is the active Mission. It adds manual opportunity tracking over the proven local workspace: partial candidature records, source material, status and archive organization, search, notes, shared concepts, recruiter-call focus views, and associations to existing CV/cover-letter documents. AI assistance and agent interoperability remain later Missions.

The M1 - Manual VCVGenerator checkpoint is accepted. The user-owned workspace, canonical career data and focused variants, editable manual CV/cover-letter documents, portable LaTeX projects, local rendering, direct-edit preservation, and unrelated-directory compilation evidence are proven product baseline capabilities. A completed Mission checkpoint records the bounded capability accepted for that Mission; it is not by itself a claim that every eventual capability named in the canonical SPEC has already been implemented.

The M0 - Foundation checkpoint is accepted. The secure Electron + React + TypeScript + SQLite boundary, verification path, and native packaging evidence remain the development baseline rather than current product scope.

Authoritative material:

- [`docs/SPEC.md`](docs/SPEC.md)
- [`.agentic/CONSTITUTION.md`](.agentic/CONSTITUTION.md)
- [`.agentic/CURRENT_MISSION.md`](.agentic/CURRENT_MISSION.md)
- [`AGENTS.md`](AGENTS.md)

## Development baseline

Use Node 24 and the committed npm lockfile:

```text
npm ci
npm run verify
npm start
```

The fast `verify` path runs strict TypeScript, lint, and behavior tests. Native package evidence is separate because it launches an OS-specific Electron executable:

```text
npm run verify:package
```

The packaged smoke uses an isolated temporary profile, checks the renderer privilege boundary and fixed preload allowlist, and initializes a real file-backed SQLite workspace.
