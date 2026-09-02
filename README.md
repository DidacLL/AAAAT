# AAAAT v2

AAAAT is a private, local-first career workspace for candidature management and portable CV and cover-letter creation. It remains fully useful without AI, may use configured AI through privacy-projected validated operations, and can later expose bounded capabilities to external tools.

AAAAT v2 is a clean restart. The Python/wxPython v1 implementation remains available through Git history and the `v1-prototype-final` tag; it is research evidence, not a compatibility target.

## Current mission

M0 - Foundation proves the secure Electron + React + TypeScript + SQLite desktop boundary, automated verification, and native packaging. Product domains begin only after that proof is complete.

Authoritative material:

- [`docs/SPEC.md`](docs/SPEC.md)
- [`.agentic/CONSTITUTION.md`](.agentic/CONSTITUTION.md)
- [`.agentic/CURRENT_MISSION.md`](.agentic/CURRENT_MISSION.md)
- [`AGENTS.md`](AGENTS.md)

## M0 development

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
