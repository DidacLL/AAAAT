# AAAAT v2

AAAAT is a private local job-search workspace and application-document tool. It reduces the effort of capturing, retrieving, reusing, and turning fragmented opportunity and professional information into user-owned application material.

[PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md) is the authoritative product definition. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) explains rationale without creating requirements. [OWNER_DEVELOPMENT_PRINCIPLES.md](OWNER_DEVELOPMENT_PRINCIPLES.md) governs development style. [AGENTS.md](AGENTS.md) is the development entry point; [docs/SPEC.md](docs/SPEC.md) is derived technical architecture; [.agentic/CURRENT_MISSION.md](.agentic/CURRENT_MISSION.md) identifies current execution only.

For alpha installation, manual workflows, optional AI, backup/restore, and troubleshooting, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Development

```text
npm ci
npm run verify
npm start
```

Packaging evidence is separate:

```text
npm run verify:package
```
