# AAAAT v2

AAAAT is a private, local career/application workspace and application-artifact generator. Its primary ordinary path is intentionally direct: **paste a job offer → create a tailored CV, a cover letter, or both**. AAAAT can retain the underlying opportunity/application context automatically instead of forcing the user to administer a candidature before doing the work.

Standalone CV and cover-letter work remains independently core. Reusable professional information, raw Sources, Tags, saved applications, document source/output and optional AI stay locally owned and editable.

AAAAT is not an in-app job-discovery/search engine and is not tied to an LLM provider or host. External assistants such as ChatGPT, Claude, local agents or editor hosts may use AAAAT through bounded capabilities, while AAAAT remains authoritative for its local data and rendering. The bounded surface does not grant generic database, filesystem, shell or process authority. VS Code is one optional adapter, not a product dependency.

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
