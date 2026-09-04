# AAAAT v2

AAAAT is a private, local-first career workspace for candidature management and portable CV and cover-letter creation. It remains fully useful without AI, may use configured AI through privacy-projected validated operations, and can expose bounded capabilities to external tools.

AAAAT v2 is a clean restart. The Python/wxPython v1 implementation remains available through Git history and the `v1-prototype-final` tag; it is research evidence, not a compatibility target.

For alpha installation, first-run use, manual workflows, optional AI, backup/restore, and troubleshooting, see the [AAAAT alpha user guide](docs/USER_GUIDE.md).

## Current product state

M6 — Opportunity Understanding & Recruiter Readiness is paused and reconciled against canonical Product Owner authority. Its technically sound implementation remains available as evidence, but its previous product contract is not active product authority.

M0 through M5 remain accepted capability/technical checkpoints. Their implementation and verification evidence remain valuable where technically applicable, but their historical names, Issues, acceptance wording, and implementation details do not define or complete current product meaning.

There is no authoritative M7–M11 roadmap. Future product work derives exactly one next Mission from `docs/OWNER_INTENT.md` + `docs/SPEC.md` + actual current implementation/evidence, and that Mission is decomposed only after Product Owner activation.

Product-authority and development references:

- [`docs/OWNER_INTENT.md`](docs/OWNER_INTENT.md) — canonical Product Owner authority
- [`docs/SPEC.md`](docs/SPEC.md) — derived product/technical specification
- [`.agentic/CURRENT_MISSION.md`](.agentic/CURRENT_MISSION.md) — current paused/reconciled Mission state
- [`.agentic/CONSTITUTION.md`](.agentic/CONSTITUTION.md) — durable technical/product invariants subject to higher product authority
- [`AGENTS.md`](AGENTS.md) — agent execution and authority routing

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

## Workspace backup and restore

M4 recovery is two fixed packaged operations over a user-owned workspace and user-chosen empty directories:

```text
AAAAT --workspace-backup --workspace <existing-AAAAT-workspace> --destination <empty-backup-directory>
AAAAT --workspace-restore --backup <backup-directory> --destination <empty-workspace-directory>
```

Backup creates a consistent SQLite snapshot with Node's SQLite backup API plus regular user-owned workspace files and a versioned portable manifest. The manifest contains only relative paths, sizes, SHA-256 hashes, migration metadata, creation time, and declared exclusions. It does not store absolute source paths. Local AI connection configuration, SQLite WAL/SHM sidecars, `.env` material, common private-key/certificate files, symbolic links, and special files are excluded by default.

Restore treats the backup as untrusted input. Before writing the destination it validates the manifest, relative paths, regular-file/symlink containment, every declared size/hash, SQLite integrity, and migration-history compatibility. Source and destination may not overlap, restore requires an empty destination, and failed activation removes partial state. A successful restored workspace must open through the normal workspace path.

## Release artifacts

The current alpha release build uses the same Electron Forge package already exercised by the native smoke suite:

```text
npm ci
npm run make
```

On Windows and macOS this creates a ZIP containing the packaged application. On Linux it creates a Debian package for Debian/Ubuntu-style systems. Release CI creates and inspects the same artifacts before uploading them as workflow artifacts.

These alpha artifacts are not code-signed or notarized and AAAAT does not yet include an auto-update or publishing service. Platform security warnings for unsigned builds are therefore expected and are not hidden or bypassed by the application.

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
