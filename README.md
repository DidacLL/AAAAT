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

## First bounded external command

The first M4 external-control capability creates a new candidature through the packaged AAAAT executable and the normal candidature application service:

```text
AAAAT --external-command candidature.create --workspace <existing-AAAAT-workspace>
```

Write one JSON object matching the desktop candidature-create fields to stdin. Success writes only `{"ok":true,"capability":"candidature.create","created":true}` and exits with status 0. Invalid or unsupported requests return a bounded error object and status 2. The command does not expose listing, updates, entity IDs, paths, database access, shell/process/network authority, or a background service.

## Official MCP stdio

The first MCP surface exposes the same bounded creation capability through the official TypeScript SDK and the packaged executable:

```text
AAAAT --mcp --workspace <existing-AAAAT-workspace>
```

A host launches that process over stdio. The server currently advertises only `candidature_create`; its input matches the normal candidature-create fields and its success result contains only a narrow acknowledgement. MCP mode does not expose listing, updates, internal IDs, paths, general database/filesystem/shell/process/network authority, prompts, resources, model sampling, or a network listener.

## VS Code MCP setup

The first demonstrated host path targets VS Code. Setup is two-stage so AAAAT never silently activates generated host integration material.

Propose the portable workspace manifest:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project>
```

Then explicitly activate it:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project> --activate
```

The proposal is stored as `integrations/vscode-mcp.json` inside the AAAAT workspace and contains no machine-local paths or secrets. Activation validates that exact manifest, the selected workspace and executable, and the live MCP tool surface before writing only the `aaaat` server entry in the project's `.vscode/mcp.json`. A matching existing entry is accepted; a conflicting entry is refused. VS Code retains its own MCP trust and enablement controls.

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
