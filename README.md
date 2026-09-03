# AAAAT v2

AAAAT is a private, local-first career workspace for candidature management and portable CV and cover-letter creation. It remains fully useful without AI, may use configured AI through privacy-projected validated operations, and can expose bounded capabilities to external tools.

AAAAT v2 is a clean restart. The Python/wxPython v1 implementation remains available through Git history and the `v1-prototype-final` tag; it is research evidence, not a compatibility target.

## Current mission

M4 - Agentic Interoperability and Setup is active. It adds one demonstrated bounded external capability at a time, followed by official MCP, adaptive real-host integration, incremental installer/setup knowledge, configuration portability, and safe backup/restore. External integrations use the same application services as the desktop UI and never receive general database, filesystem, shell, process, network, repository, or generic privileged authority. AI remains optional.

The M3 - AI Assistance checkpoint is accepted. Optional direct model-provider assistance is proven over the manual workspace through operation-specific minimum context, privacy projection before inference, typed validated results, explicit conflict policy, and normal application-service mutations. AI remains optional and provider-neutral.

The M2 - Candidature Workspace checkpoint is accepted. Manual incomplete opportunity tracking, source/notes, status and independent archiving, search/filtering, shared concepts, recruiter-call focus views, and associations to existing CV/cover-letter documents are proven baseline capabilities. The post-M2 stabilization corrections for dirty-editor state, TeX/document recovery, migration history, and truthful activity semantics are also complete.

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
