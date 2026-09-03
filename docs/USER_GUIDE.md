# AAAAT alpha user guide

AAAAT is a local-first desktop career workspace. Your workspace stays in a folder you choose on your computer. The core product works without AI.

## 1. Get and start AAAAT

Current alpha builds are produced by the repository's successful `Verify` workflow. There is not yet a stable download channel, updater, code-signing setup, or notarization service.

The current artifact formats are:

- Windows: ZIP containing the packaged AAAAT application;
- macOS: ZIP containing `AAAAT.app`;
- Debian/Ubuntu Linux: `.deb` package.

The alpha builds are unsigned. Windows or macOS may therefore show normal platform warnings for an untrusted/unsigned application. AAAAT does not bypass those platform controls.

For Linux, install the `.deb` with your normal Debian/Ubuntu package tooling. The package records the Chromium sandbox helper with the ownership/mode required by Electron; users should not need to repair the packaged sandbox manually.

Developers may build the same artifacts with Node 24 and the repository checkout:

```text
npm ci
npm run make
```

Command examples later in this guide use `AAAAT` to mean the packaged AAAAT executable. If it is not on your `PATH`, substitute the executable's actual platform path/name.

## 2. Create or open your local workspace

On first launch AAAAT asks where it should keep the career workspace.

- **Create workspace**: choose an empty folder. AAAAT initializes its SQLite database and workspace structure there.
- **Open existing workspace**: choose a compatible AAAAT v2 workspace that already exists.

AAAAT shows the selected workspace path while it is open. Use **Choose another workspace** to switch.

A folder that is non-empty but is not already a compatible AAAAT workspace is rejected. AAAAT v2 does not migrate AAAAT v1 workspaces.

If the previously used workspace was moved, deleted, or is no longer available, AAAAT asks you to choose another workspace rather than silently creating replacement data elsewhere.

## 3. Use AAAAT without AI

The main workspace areas are **Candidatures**, **Profile**, **Documents**, **AI assist**, and **Settings**. The first three form the normal manual path and do not require an AI connection.

### Profile

Use **Profile** for canonical professional information such as experience, education, projects, skills, certifications, languages, links, and related career knowledge. Named profile variants focus or override selected details without creating a second copy of your professional identity.

A practical starting sequence is:

1. add the career information you want to reuse;
2. create a focused profile variant when a role needs different emphasis;
3. keep authoritative information in the canonical profile and use variants only for differences.

### Documents

Use **Documents** to create and edit CVs and cover letters from the career profile and selected variant. AAAAT keeps document content editable and produces a normal LaTeX project in the user-owned workspace.

Generated projects are intended to remain useful outside AAAAT. They contain the non-standard source they need, do not depend on absolute paths back into the AAAAT repository, and can be copied to another directory or used with ordinary compatible TeX tools.

If you edit managed TeX source directly, AAAAT protects those edits instead of silently overwriting them. Follow the application's manual-mode/recovery prompts before regenerating a directly edited project.

### Candidatures

Use **Candidatures** for job-search opportunities. A candidature may remain incomplete; you do not need to invent missing information. The workspace supports source material and notes, lifecycle status, independent archiving, shared concepts/keywords, recruiter-call focus information, and association with existing CV or cover-letter documents.

The manual workflow remains valid if AI is never configured.

## 4. Local PDF rendering and TeX prerequisites

AAAAT generates portable LaTeX source itself, but local PDF rendering uses TeX tools installed on your computer.

Install `latexmk` and the engine used by the document. The baseline engine is `pdflatex`; `lualatex` and `xelatex` are supported where the document/template uses them.

If the tools are missing, AAAAT reports that TeX rendering could not start and identifies `latexmk` and the required engine. The generated source is still user-owned and may be compiled independently with compatible tools after those prerequisites are installed.

A rendering failure does not make AI necessary and does not change the authoritative profile/candidature data.

## 5. Optional local AI assistance

AI is optional. In **Settings**, the current implemented connection path is a keyless, loopback-only OpenAI-compatible endpoint. The default example base URL is:

```text
http://localhost:11434/v1
```

Enter a connection name, model name, and local provider base URL, then use **Save local connection**. Only loopback endpoints are accepted by the current user-facing connection path; remote API-key setup is not part of this alpha path.

After a local connection is configured, **AI assist** and AI-assisted candidature actions can use bounded operations such as job extraction, fit assessment, profile-variant recommendation, and document proposals. AAAAT constructs operation-specific context, applies its privacy projection, validates the response, and uses normal application services for permitted changes.

If no local model is running or the AI connection fails, continue using **Profile**, **Documents**, and **Candidatures** manually.

## 6. Back up a workspace

Backup and restore are currently packaged command operations rather than desktop buttons.

Create a backup into an existing empty directory:

```text
AAAAT --workspace-backup --workspace <existing-AAAAT-workspace> --destination <empty-backup-directory>
```

The backup contains a consistent SQLite snapshot, relevant regular user-owned workspace files, and a portable manifest with relative paths, hashes, sizes, migration metadata, creation time, and declared exclusions.

Secrets and machine-local/transient material are excluded by default, including the local AI connection file, SQLite WAL/SHM sidecars, `.env` material, common private-key/certificate files, symbolic links, and special files.

Keep the complete backup directory together; do not edit its manifest or payload if you expect restore validation to succeed.

## 7. Restore a workspace

Restore into an existing empty destination directory:

```text
AAAAT --workspace-restore --backup <backup-directory> --destination <empty-workspace-directory>
```

Before writing the destination, AAAAT validates the manifest, relative paths, file sizes/hashes, SQLite integrity, and migration-history compatibility. The backup and destination may not overlap. Invalid or corrupted backups fail closed, and a failed activation removes partial restored state.

After a successful restore, launch AAAAT and choose **Open existing workspace** for the restored directory.

Because AI connection configuration is intentionally excluded from backups, reconfigure optional local AI in **Settings** after restore if you want it.

## 8. Optional VS Code MCP integration

The current demonstrated external-host integration is VS Code and is optional. It exposes only the bounded candidature-creation capability through AAAAT's official MCP stdio server.

First create the proposed portable integration manifest:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project>
```

Then explicitly activate it:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project> --activate
```

Activation validates the workspace, executable, manifest, and live MCP tool surface before writing the `aaaat` entry in `.vscode/mcp.json`. VS Code keeps its own trust and enablement controls. This integration is not required for ordinary desktop use.

## 9. Troubleshooting

**AAAAT warns that the build is unsigned or untrusted.** The current alpha artifacts are intentionally not code-signed/notarized. Use your operating system's normal security UI to decide whether to run the build; AAAAT does not disable or bypass platform protections.

**The previous workspace is unavailable.** Choose another existing AAAAT v2 workspace or create a new one in an empty folder. AAAAT does not silently relocate the old workspace.

**A folder cannot be used as a workspace.** For **Create workspace**, choose an empty folder or an already compatible AAAAT workspace. For **Open existing workspace**, select a compatible AAAAT v2 workspace.

**PDF rendering cannot start.** Install `latexmk` and the selected TeX engine (`pdflatex`, `lualatex`, or `xelatex`) and retry. Your generated LaTeX source remains available even when rendering fails.

**AI actions fail or no AI is configured.** AI is optional. Check that the configured local OpenAI-compatible endpoint is running and remains a loopback address. Manual Profile, Documents, and Candidatures workflows continue to work without it.

**Restore rejects a backup.** Do not bypass validation. Use an intact AAAAT backup directory and a separate empty destination. A restore may reject modified manifests/payloads, path traversal, file corruption, incompatible migration history, overlapping directories, symlinks, or special files.

## Current alpha limitations

The current release path deliberately does not include code signing/notarization, an updater, an automated GitHub Release publisher, a Windows installer, a macOS DMG, or RPM/AppImage/Snap/Flatpak packages. Those absences should not be interpreted as hidden features or automatic setup.
