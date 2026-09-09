# AAAAT v2

AAAAT is a private local job-search workspace and application-document tool. It reduces the effort of capturing, retrieving, reusing, and turning fragmented opportunity and reusable professional information into user-owned application material. It remains useful without AI; optional assistance is bounded to the work at hand rather than a separate product workflow.

[PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md) is the authoritative product definition. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) explains rationale without creating requirements. [OWNER_DEVELOPMENT_PRINCIPLES.md](OWNER_DEVELOPMENT_PRINCIPLES.md) governs development style. [AGENTS.md](AGENTS.md) is the development entry point; [docs/SPEC.md](docs/SPEC.md) is derived technical architecture; [.agentic/CURRENT_MISSION.md](.agentic/CURRENT_MISSION.md) identifies current execution only.

For alpha installation, manual workflows, optional AI, backup/restore, and troubleshooting, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

AI connections are optional. For each connection, the current slice stores the user-defined connection name, endpoint, and model. It accepts loopback `http:` endpoints and remote `https:` endpoints whose authentication is already handled outside AAAAT. Credential, API-key, OAuth, provider-account, and secret-storage configuration are outside this slice.

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
