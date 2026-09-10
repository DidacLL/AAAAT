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
- **Restore workspace backup**: choose an AAAAT backup directory and then a separate empty destination. AAAAT validates the backup before opening the restored workspace.

AAAAT shows the selected workspace path while it is open. Use **Choose another workspace** to switch.

A folder that is non-empty but is not already a compatible AAAAT workspace is rejected. AAAAT v2 does not migrate AAAAT v1 workspaces.

If the previously used workspace was moved, deleted, or is no longer available, AAAAT asks you to choose another workspace or restore a backup rather than silently creating replacement data elsewhere.

## 3. Use AAAAT without AI

The main workspace areas are **Candidatures**, **Professional information**, **CVs & letters**, and **Settings**. Ordinary work in Candidatures, Professional information, and CVs & letters does not require an AI connection.

### Professional information

Use **Professional information** for reusable experience, education, projects, skills, certifications, languages, links, summaries, and related material. Saved variations can give a role or market different emphasis without creating a second professional identity.

A practical starting sequence is:

1. add the career information you want to reuse;
2. create a saved variation only when a role needs different emphasis;
3. keep reusable information in one place and use variations only for deliberate differences.

### Documents

Use **CVs & letters** to create and edit CVs and cover letters from reusable professional information, optionally applying a saved variation when different emphasis is useful. AAAAT keeps document content editable and produces a normal LaTeX project in the user-owned workspace.

For a CV, **AI-visible CV description** provides optional user-authored tags and notes for a chosen external assistant. These fields are empty by default and do not change the CV itself, its reusable professional-information basis, its TeX project, or its rendered PDF. They are deliberately separate from saved-variation target tags. If you enable the external `cv_descriptions_read` operation, only CVs with at least one saved descriptor are disclosed, and only their saved tags/notes are returned under temporary labels such as `CV 1`; the operation does not disclose the CV title, content, local document ID, file paths, candidature links, or artifacts.

**External CV content access** is a separate, broader choice. If descriptor tags/notes are not enough for the assistant to judge the material, you may explicitly allow one working CV to be read through `cv_content_read`. AAAAT asks for confirmation before allowing it, and selecting another CV replaces the previous selection. The tool receives the effective CV item content after the document's inclusion choices, overrides, and ordering. It does not receive the working-document title or ID, local professional-information item IDs, file paths, raw TeX/PDF, descriptor tags/notes, candidature history, or other documents. Revoke the permission from the same Documents panel when you no longer want that content available. Unsaved structured edits must be saved before changing this permission, so the shared content is always the persisted effective CV.

**External PDF rendering** is a separate production permission on top of content access. Allowing an assistant to read the CV does not allow it to render anything. After content access is enabled for that CV, you may separately confirm **Allow external PDF rendering**. The external `cv_render` tool then has no selector, path, engine, command, or output controls: it can only ask AAAAT to run the same normal local render for that one CV and receives only a success acknowledgement. Revoking content access also revokes render authorization automatically. Render authorization can also be revoked independently while leaving content access enabled.

Generated projects are intended to remain useful outside AAAAT. They contain the non-standard source they need, do not depend on absolute paths back into the AAAAT repository, and can be copied to another directory or used with ordinary compatible TeX tools.

If you edit managed TeX source directly, AAAAT protects those edits instead of silently overwriting them. Follow the application's manual-mode/recovery prompts before regenerating a directly edited project.

### Candidatures

Use **Candidatures** for job-search opportunities. A candidature may remain incomplete; you do not need to invent missing information. The workspace supports source material and notes, lifecycle status, independent archiving, shared concepts/keywords, recruiter-call focus information, and association with existing CV or cover-letter documents.

The manual workflow remains valid if AI is never configured.

## 4. Local PDF rendering and TeX prerequisites

AAAAT generates portable LaTeX source itself, but local PDF rendering uses TeX tools installed on your computer.

In **Settings**, **Local setup status** checks the current workspace and whether `latexmk` and `pdflatex` are already available. This check is read-only: AAAAT reuses working tools and does not install packages, replace a TeX distribution, edit `PATH`, or run an arbitrary command supplied by the renderer.

The same Settings area generates copyable `installer.ai` guidance from that status. It tells a free-chat assistant which required TeX tools are available or missing, asks it to preserve working software, and asks for ordinary operating-system-appropriate installation guidance only where needed. The copied prompt does not include the workspace path or detected TeX version strings. AAAAT does not send the prompt automatically.

Install `latexmk` and `pdflatex` if the setup status reports them missing. AAAAT documents target the portable pdfLaTeX/pdfTeX baseline. After installing compatible tools through your normal operating-system or TeX-distribution method, use **Refresh environment** in Settings.

If the tools are missing, AAAAT reports that TeX rendering could not start and identifies `latexmk` and the required engine. The generated source is still user-owned and may be compiled independently with compatible tools after those prerequisites are installed.

A rendering failure does not make AI necessary and does not change the authoritative professional-information or candidature data.

## 5. Optional AI assistance

AI is optional. In **Settings**, AAAAT can keep several named OpenAI-compatible connections. A loopback connection may use `http:`; a remote connection must use `https:`. The default local example base URL is:

```text
http://localhost:11434/v1
```

For each connection, this current slice stores the user-defined connection name, model name, and base URL. It has no credential, API-key, OAuth, provider-account, authorization-header, or secret-storage configuration. A remote endpoint must therefore already be authenticated outside AAAAT. The first connection becomes the general default; adding another connection does not switch that choice. The general default is only a convenience fallback for operations that have been validated against that exact endpoint/model.

Before using a configured connection for an AI operation, validate that operation from **Settings**. Validation sends only synthetic AAAAT data through the existing operation contract; it does not send your candidature, professional information, Sources, or documents, and it is not a benchmark of model quality. The first successful validation for an operation becomes that operation's default when no operation default exists. Later validations do not switch it automatically. You can explicitly choose another validated connection for that operation.

Changing a connection's endpoint or model clears its recorded operation validations because the capability boundary changed. A name-only edit keeps them. Removing a connection clears any operation defaults that referenced it. AAAAT never scans other configured connections or falls back to another model automatically.

Use **Export AI setup** to save a small portable setup file containing only connection names, accepted endpoints, model names, and the selected general default. The portable file does not contain AAAAT's local connection IDs, operation-validation results, per-operation defaults, workspace paths, credential material, or career/application data.

Use **Import AI setup** to replace the current named AI setup from one of those files. AAAAT asks for confirmation before replacement. Imported connections receive fresh local IDs, preserve the general default by connection name, and start with no validated operations or per-operation defaults. Validate the operations you intend to use again on the destination computer before relying on AI assistance. Cancelling the file picker leaves the current setup unchanged.

The same **Setup status** summarizes how many AI connections are configured and which active AI operations have a validated route. This is a capability/routing status, not a model-quality score.

Settings also generates copyable `configurator.ai` guidance for a free-chat assistant. It carries only the configured-connection count and validated-route availability, not connection names, endpoints/models, workspace paths, or career/application content. The prompt tells the assistant to keep AI optional, use normal AAAAT Settings, avoid JSON/SQLite editing and invented authentication details, and recommend only explicitly validated operation routes. AAAAT never sends this guidance automatically; copying it is an explicit user action.

The current connection path accepts loopback `http:` endpoints and remote `https:` endpoints whose authentication is already handled outside AAAAT. Authentication and credential configuration are outside this slice rather than a product-wide prohibition.

When an operation has a validated route, contextual assistance can use bounded operations such as job extraction, opportunity review, saved-variation recommendation, historical information discovery, CV tailoring, and cover-letter drafting. AAAAT constructs operation-specific context, applies its privacy projection, validates the response, and uses normal application services for permitted changes. It does not compare candidatures, rank opportunities, choose a winner, or prescribe career actions.

When you save a Source-backed candidature and job extraction is available, choose **Review source with AI** in the same candidature flow. AAAAT first retains the Source. Before it sends anything, it shows the selected connection, whether that connection is local or remote, and the exact retained Source material to be disclosed; the ordinary review surface does not expose the literal endpoint. The AI result is a set of individually reviewable proposals; accept only the information you want to keep. Dismissing the review, unavailable AI, or a provider failure leaves the saved Source-backed candidature intact.

For historical information discovery inside a candidature, choose **Discover from Sources**, then select one or more retained Sources. Nothing is preselected. AAAAT shows the selected Source material before sending, requires a non-empty selection, and passes only those selected Sources to the discovery operation. Any returned value remains a proposal until you accept it through the normal candidature information service.

If no connection has been validated for the requested operation, or an AI connection fails, continue using **Professional information**, **CVs & letters**, and **Candidatures** manually.

## 6. Back up a workspace

Open **Settings → Workspace backup and restore** and choose **Back up workspace**. Select a separate existing empty folder, or create an empty folder in the system picker. AAAAT creates the backup there; the renderer never receives or stores the selected filesystem path.

The backup contains a consistent SQLite snapshot, relevant regular user-owned workspace files, and a portable manifest with relative paths, hashes, sizes, migration metadata, creation time, and declared exclusions.

Secrets and machine-local/transient material are excluded by default, including the local AI connection file, SQLite WAL/SHM sidecars, `.env` material, common private-key/certificate files, symbolic links, and special files.

Keep the complete backup directory together; do not edit its manifest or payload if you expect restore validation to succeed.

The packaged command remains available as a technical alternative:

```text
AAAAT --workspace-backup --workspace <existing-AAAAT-workspace> --destination <empty-backup-directory>
```

## 7. Restore a workspace

Choose **Restore workspace backup** either on the first-run/no-workspace screen or in **Settings → Workspace backup and restore**. Select the backup directory first, then a separate empty destination directory.

If another workspace is already open, AAAAT confirms before switching. Unsaved-editor state is protected before the restore operation is invoked. Before writing the destination, AAAAT validates the manifest, relative paths, file sizes/hashes, SQLite integrity, and migration-history compatibility. The backup and destination may not overlap. Invalid or corrupted backups fail closed, and a failed activation removes partial restored state.

After a successful restore, AAAAT immediately opens and remembers the restored workspace. If restore fails, the previously open workspace remains current. Cancelling either directory picker is a no-op.

The packaged command remains available as a technical alternative:

```text
AAAAT --workspace-restore --backup <backup-directory> --destination <empty-workspace-directory>
```

Because AI connection configuration is intentionally excluded from workspace backups, import a separately exported portable AI setup in **Settings** if you want to restore those connection definitions. Operation validations and per-operation defaults are intentionally not portable and must be re-established on the restored computer.

## 8. Advanced optional VS Code MCP integration

The current demonstrated external-host integration is VS Code and is optional. It is advanced technical integration, not ordinary setup. It uses AAAAT's official MCP stdio server and currently exposes seven bounded named operations:

- `candidature_create` creates one candidature from one retained Source through the ordinary candidature service;
- `opportunity_research_context_read` accepts no candidature selector and returns `null` unless you have deliberately selected one candidature for this external task. When selected, it returns a formatted projection of that candidature's retained information that is permitted for AI context. Omitted information stays local and token-mode information leaves only as a local placeholder;
- `candidature_source_add` accepts only validated Source material and retains it through AAAAT's ordinary Source service on the candidature selected for the external task. It cannot choose or browse candidatures and returns only `{ "retained": true }` or `null`;
- `career_context_read` returns only non-empty user-written Career preferences values: career direction, objectives, constraints, target roles, target markets/locations, work preferences, and application-writing preferences;
- `cv_descriptions_read` returns only explicitly saved AI-visible CV tags and notes under response-local labels such as `CV 1`. Blank/un-described CVs and all cover letters are omitted;
- `cv_content_read` accepts no selector and returns `null` unless you have deliberately allowed one CV in Documents. When allowed, it returns only that working CV's effective resolved profile-item content after document-specific inclusion, overrides, and ordering;
- `cv_render` accepts no selector or render controls and returns `null` unless the same content-selected CV also has separate local external-render authorization. When authorized, it asks AAAAT to perform its ordinary local PDF render and returns only `{ "rendered": true }`.

External capabilities are task-scoped rather than broad data access. The information needed by one task does not automatically become available to another task. A task may legitimately use more or less retained information depending on its purpose, but it receives only a formatted operation payload rather than database, corpus, filesystem or arbitrary entity authority. Broad/private experiences such as seeing the candidature corpus together or inspecting complete private user information remain AAAAT application experiences rather than data-export APIs.

`opportunity_research_context_read`, `career_context_read`, `cv_descriptions_read`, and `cv_content_read` are read-only. The opportunity-research read cannot expose Sources, other candidatures, professional information, Career preferences, documents, Concepts, ToDos, activity/history, local IDs, or workspace paths. `candidature_source_add` is the corresponding bounded return path: it writes only a Source to the locally selected candidature and cannot mutate candidature fields or other records. `cv_descriptions_read` does not expose CV titles, document content, durable local IDs, reusable professional-information or variation data, file paths, candidature links/history, Sources or artifacts, and its synthetic labels are not persistent document references. `cv_content_read` is broader because it returns CV content, but it still does not expose the document title/ID, local item IDs, file paths, raw TeX/PDF, descriptors, candidature history, other documents, or caller-controlled selection/query authority. `cv_render` is a production action, not an additional data-reading route: it cannot select a document, path, engine, command or output location and does not return document identity, paths, TeX/PDF bytes, logs or environment details. Content disclosure never enables rendering automatically; the render permission is a separate user choice and is cleared when content access is revoked or moved to another CV. These tools do not provide a generic browse/search/query/filesystem/process surface. Treat host activation and each task/content authorization as distinct trust decisions.

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

**The previous workspace is unavailable.** Choose another existing AAAAT v2 workspace, create a new one in an empty folder, or restore a compatible backup. AAAAT does not silently relocate the old workspace.

**A folder cannot be used as a workspace.** For **Create workspace**, choose an empty folder or an already compatible AAAAT workspace. For **Open existing workspace**, select a compatible AAAAT v2 workspace.

**PDF rendering cannot start.** Check **Settings → Local setup status**. Install `latexmk` and `pdflatex` through a compatible TeX distribution if they are missing, then refresh the environment status and retry. Your generated LaTeX source remains available even when rendering fails.

**AI actions fail or no AI is configured.** AI is optional. Check that the selected OpenAI-compatible endpoint is available, that it is loopback `http:` or remote `https:`, and that any remote authentication is already handled outside AAAAT. Then validate the specific operation in **Settings**. If several validated connections exist, choose the desired operation default explicitly. Manual Professional information, CVs & letters, and Candidatures workflows continue to work without AI.

**Restore rejects a backup.** Do not bypass validation. Use an intact AAAAT backup directory and a separate empty destination. A restore may reject modified manifests/payloads, path traversal, file corruption, incompatible migration history, overlapping directories, symlinks, or special files.

## Current alpha limitations

The current release path deliberately does not include code signing/notarization, an updater, an automated GitHub Release publisher, a Windows installer, a macOS DMG, or RPM/AppImage/Snap/Flatpak packages. The current setup status and free-chat guidance detect/explain capabilities but do not install software, edit system configuration, configure provider accounts, or silently mutate AAAAT configuration. Portable AI setup import/export is explicit and limited to the named connection definitions/general default described above.
