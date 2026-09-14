# AAAAT alpha user guide

AAAAT is a private, local career/application information workspace and application-artifact generator. Your authoritative workspace stays in a folder you choose. Core use does not require AI.

AAAAT is not an in-app job-discovery/search engine. You can bring material from anywhere, and external AI or other tools may participate in broader job-search or research work while using AAAAT through bounded capabilities.

## 1. Get and start AAAAT

Current alpha builds are produced by the repository's successful `Verify` workflow. There is not yet a stable download channel, updater, code-signing setup, or notarization service.

Current artifact formats are:

- Windows: ZIP containing the packaged AAAAT application;
- macOS: ZIP containing `AAAAT.app`;
- Debian/Ubuntu Linux: `.deb` package.

The alpha builds are unsigned, so Windows or macOS may show normal platform trust warnings. AAAAT does not bypass those controls.

Developers may build the same artifacts with Node 24 and the repository checkout:

```text
npm ci
npm run make
```

## 2. Create or open your local workspace

On first launch AAAAT asks where it should keep the local workspace.

- **Create workspace**: choose an empty folder.
- **Open existing workspace**: choose a current compatible AAAAT v2 workspace.
- **Restore workspace backup**: choose an AAAAT backup directory and then a separate empty destination.

AAAAT shows the selected workspace while it is open and lets you switch deliberately. A non-empty folder that is not already a compatible current workspace is rejected rather than silently repurposed.

If a previously used workspace was moved, deleted, or is unavailable, AAAAT asks you to choose another workspace or restore a backup instead of inventing replacement data.

## 3. Main product areas

The main workspace areas are **Candidatures**, **Professional information**, **CVs & letters**, and **Settings**. Candidatures, Professional information, and CVs & letters remain usable with no AI connection.

### Candidatures

Use **Candidatures** for opportunities/application contexts you want AAAAT to retain. A candidature may contain almost nothing or a large amount of information; sparse or raw-only records are valid.

The rapid-retrieval experience has two Focus states:

1. **Corpus Focus** shows multiple candidatures together so you can recognize the relevant one quickly. Search can use retained information, Source text, and Tags/aliases. No candidature is forced selected on entry.
2. **Selected Focus** shows one candidature with the richer subset configured/useful for rapid recall. It is not a lifecycle dashboard, checklist, reminder board, or complete editor.

You can also open **complete candidature management** directly. Complete work exposes retained structured information, full Sources, Tags, candidature-linked application material, privacy/presentation controls, and secondary supporting data through progressive disclosure.

Candidature fields are user-maintainable product data. Different professions can keep different field sets; for example, a pilot may care about flight hours or aircraft types while another profession may need unrelated fields. Users can add and edit field definitions instead of being limited to a developer-owned fixed ontology. Normal value editing stays simple; field-definition controls are secondary/progressively disclosed.

**Tags** are the shared reusable keyword/glossary object. A Tag may have a canonical name, aliases, definition, notes, and candidature associations.

Formal lifecycle/status/priority/next-action tracking is not required for core AAAAT use. Archive remains secondary corpus organization rather than a mandatory lifecycle.

### Create a candidature

AAAAT exposes two direct creation approaches. Neither is canonical:

- **New candidature — fill fields**: create it by entering structured values directly.
- **New candidature — paste raw material**: paste whatever offer/message/web/form/note material you have and retain it first as a Source.

The raw path requires only the raw material. It does not require a dedicated company, role, URL, title, source type, status, priority, or next action before saving.

After raw material is retained, AAAAT shows both continuations together:

- **Send to AI**: available only when a suitable validated `job_extraction` route exists. The extraction proposes values for the current configured candidature fields.
- **Fill candidature yourself**: opens the retained raw Source beside editable candidature fields so you can copy/enter values manually with minimal context switching.

The manual side-by-side path is a first-class no-AI workflow, not an error fallback. At constrained window sizes it may stack/scroll instead of staying in literal columns, while keeping Source and fields available in the same task surface.

### Professional information

Use **Professional information** for reusable career material such as experience, education, projects, skills, certifications, languages, links, summaries, objectives/preferences/constraints and other information you want available across candidatures and documents.

Saved variations can give a role or market different emphasis without creating a second professional identity. Reusable information remains user-owned and editable.

### CVs & letters

Use **CVs & letters** to create and edit CVs and cover letters from reusable professional information, optionally applying saved variations/differences. VCVGenerator is independently useful: you can work on a CV or cover letter without a candidature and without AI.

AAAAT keeps document content editable and produces local user-owned LaTeX projects. Generated projects are intended to remain portable rather than depending on absolute paths back into the AAAAT repository.

If managed TeX source was edited directly, AAAAT protects those edits instead of silently overwriting them; follow the application's manual-mode/recovery prompts before regenerating.

## 4. Local PDF rendering and TeX prerequisites

AAAAT generates portable LaTeX source itself, but local PDF rendering uses TeX tools installed on your computer.

In **Settings**, **Local setup status** checks whether the current workspace is usable and whether `latexmk` and `pdflatex` are available. The check is read-only: AAAAT reuses working tools and does not silently install packages, replace a TeX distribution, edit `PATH`, or expose arbitrary process execution.

If the tools are missing, generated source remains available and the rest of AAAAT remains usable. Install compatible TeX tools through your normal operating-system/distribution method and refresh the environment status.

## 5. Optional AI assistance

AI is optional. Settings can keep several named OpenAI-compatible connections. A loopback connection may use `http:`; a remote connection must use `https:`. The current connection definition stores the user-defined connection name, model name, and base URL. Credential/provider-account setup is outside this slice.

Before a configured connection is used for a bounded AI operation, validate that operation from **Settings**. Validation uses synthetic AAAAT data rather than your candidature, Sources, professional information, or documents.

Changing a connection endpoint or model clears its recorded operation validations because the capability boundary changed. Removing a connection clears defaults that depended on it. AAAAT does not silently scan other connections and fall back to another model.

Contextual AI operations may include extraction, selected information discovery, opportunity review, CV tailoring, cover-letter drafting, and other bounded assistance supported by the configured route. AI output is not authoritative; retained results remain ordinary editable AAAAT data.

For raw candidature capture, **Send to AI** sends the already-retained Source through the validated job-extraction route and returns proposals for the currently configured candidature fields. If no suitable route exists, the manual path remains fully available.

For retained Source discovery, AAAAT requires an explicit Source selection and shows the material being sent. Returned values remain proposals until accepted through ordinary candidature services.

## 6. Workspace backup

Open **Settings → Workspace backup and restore** and choose **Back up workspace**. Select a separate existing empty folder, or create an empty folder in the system picker.

A backup contains:

- a consistent SQLite snapshot of the current product workspace;
- relevant regular user-owned workspace files;
- a manifest containing backup format/version, creation time, relative paths, file sizes/hashes, database size/hash, and declared exclusions.

The manifest does **not** carry development migration ancestry. Backups are validated against the current product workspace schema.

Machine-local/transient or secret-like material is excluded, including the local AI connection file, SQLite WAL/SHM sidecars, `.env` material, common private-key/certificate files, symbolic links, and special files.

The packaged command remains available as a technical alternative:

```text
AAAAT --workspace-backup --workspace <existing-AAAAT-workspace> --destination <empty-backup-directory>
```

## 7. Workspace restore

Choose **Restore workspace backup** from first-run/recovery or **Settings → Workspace backup and restore**. Select the backup directory first, then a separate empty destination.

Before writing the destination, AAAAT validates the manifest, safe relative paths, file sizes/hashes, SQLite integrity, and compatibility with the current product workspace schema. Backup and destination may not overlap. Invalid or corrupted backups fail closed, and a failed activation removes partial restored state.

After successful restore, AAAAT opens the restored workspace. If restore fails while another workspace is active, the previously active workspace remains the current one.

The packaged command remains available as a technical alternative:

```text
AAAAT --workspace-restore --backup <backup-directory> --destination <empty-workspace-directory>
```

AI connection configuration is intentionally excluded from workspace backups. Export/import AI setup separately if you want those connection definitions on another machine; operation validations and per-operation defaults are not portable and must be re-established.

## 8. Advanced optional external-AI integration

External AI is a legitimate entrance into AAAAT, but it receives bounded capabilities rather than database/filesystem/process authority. An external assistant may be doing broader work such as job discovery or research outside AAAAT and then call AAAAT to retain or use local career/application information.

The current demonstrated host integration is VS Code through AAAAT's MCP stdio server. The current bounded surface includes:

- `candidature_create` — create one Source-backed candidature through the ordinary candidature service;
- `opportunity_research_context_read` — read only the locally selected candidature projection permitted for that task;
- `candidature_source_add` — retain one validated Source on the candidature locally selected for that external task;
- `career_context_read` — read only non-empty career-preference values whose local external-AI disclosure is enabled;
- `cv_descriptions_read` — read only explicitly saved AI-visible CV tags/notes under temporary labels;
- `cv_content_read` — read the effective content of one CV explicitly authorized locally;
- `cv_render` — request the normal local render for that same authorized CV when separate render authorization is enabled.

These tools do not expose a generic corpus browser, arbitrary database query, filesystem, shell, process surface, local IDs, or unrelated private areas. AAAAT controls the data/capability boundary; it does not control an external host's broader operating-system permissions.

Technical VS Code setup remains optional:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project>
```

Then deliberately activate it:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project> --activate
```

## 9. Troubleshooting

**The previous workspace is unavailable.** Choose another current compatible AAAAT v2 workspace, create a new one in an empty folder, or restore a compatible backup. AAAAT does not silently relocate the old workspace.

**A folder cannot be used as a workspace.** For **Create workspace**, choose an empty folder. For **Open existing workspace**, select a current compatible AAAAT v2 workspace.

**PDF rendering cannot start.** Check **Settings → Local setup status**. Install compatible `latexmk` and `pdflatex` tools if missing, refresh the environment status, and retry. Generated LaTeX source remains user-owned even when rendering fails.

**AI actions fail or no AI is configured.** AI is optional. Validate the specific operation route in Settings. Manual Professional information, CVs & letters, candidature creation/editing, raw capture, search, and Source-based manual filling continue to work without AI.

**Restore rejects a backup.** Do not bypass validation. Use an intact AAAAT backup directory and a separate empty destination. Restore may reject malformed/modified manifests, path traversal, file corruption, an incompatible current workspace schema, overlapping directories, symlinks, or special files.

## Current alpha limitations

The current release path does not include code signing/notarization, an updater, an automated GitHub Release publisher, a Windows installer, a macOS DMG, or RPM/AppImage/Snap/Flatpak packages. Setup guidance detects/explains capabilities but does not silently install software or mutate system/provider configuration.
