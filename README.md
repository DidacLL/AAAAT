# AAAAT v2

AAAAT is a private, local workspace for applications, reusable professional information, and editable application documents. Welcome leads to the application Focus. The same corpus also has a dense complete-data register. One New application screen saves sparse notes or details and can optionally prepare a dedicated CV or application-owned cover letter. Reusable CVs have their own work area; standalone letters remain a secondary option.

Standalone CV and cover-letter work remains independently core. Reusable professional information, raw Sources, Tags, saved applications, document source/output and optional AI stay locally owned and editable.

AAAAT is not an in-app job-discovery/search engine and is not tied to an LLM provider or host. A compatible assistant that can start a local tool may use the packaged app's bounded capabilities, while AAAAT remains authoritative for its local data and rendering. The bounded surface does not grant generic database, filesystem, shell or process authority.

[PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md) is the canonical product definition below current explicit Product Owner instruction. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) explains rationale. [OWNER_DEVELOPMENT_PRINCIPLES.md](OWNER_DEVELOPMENT_PRINCIPLES.md) governs development style. [AGENTS.md](AGENTS.md) is the development entry point; [docs/SPEC.md](docs/SPEC.md) is derived technical architecture; [.agentic/CURRENT_MISSION.md](.agentic/CURRENT_MISSION.md) identifies current execution only.

For alpha installation, ordinary workflows, `installer.ai` / `configurator.ai`, optional AI, bounded external assistants, backup/restore and troubleshooting, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

AI connections are optional. For each connection, AAAAT stores the user-defined connection name, endpoint and model. It accepts loopback `http:` endpoints and remote `https:` endpoints whose authentication is already handled outside AAAAT. Credential/provider-account setup is outside the current core.

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
