# AAAAT alpha user guide

AAAAT keeps applications, reusable professional information, CVs and cover letters in a local folder you choose. AI is optional.

Welcome appears first. It shows your last workspace and compact setup status. You can continue with it or open another folder. After Welcome, the saved-applications grid is the ordinary landing.

Use **New application** to paste an offer, message or note and/or fill the details you know. Save works with one company name or a single pasted fragment. In the same screen you may select **Parse with AI**, **Dedicated CV** and **Cover letter**. AAAAT saves the application first, then performs only the optional work you selected. A failed or unavailable AI connection does not lose the application. Linked documents remain available from that application.

**Applications** opens Focus over everything you retained. **All data** shows the same applications as a compact register. **CVs** is for reusable CV work; cover letters normally stay with their application, while standalone letters remain available as a secondary option. **My information** keeps reusable professional facts. **Settings** handles workspace recovery, optional AI connections, PDF readiness and bounded external assistance.

The application grid can search retained notes, Sources and useful details. Opening an application shows what you saved and its linked CV or letter. Empty fields are fine. An offer is one possible input, never a required workflow.
## My information

Use **My information** for reusable career material. The normal view is the information itself. Saved variations, AI disclosure and other secondary controls appear only when relevant.

AAAAT keeps local storage, presentation/Focus choices and AI disclosure as separate concepts. Information is not sent to an assistant merely because it is stored locally.

## Workspaces, demo data and reset

On first launch:

- **Create workspace** chooses an empty local folder.
- **Open existing workspace** opens a current compatible AAAAT workspace.
- **Try with demo data** creates a clearly marked fake workspace without injecting fake records into real work.
- **Restore a backup** restores into a separate empty destination.

Settings also provides **Reset workspace**, a destructive action scoped only to the current workspace and protected by confirmation.

## Local PDF rendering

AAAAT owns document data and portable LaTeX source. Local PDF rendering uses compatible `latexmk` and `pdflatex` commands already available on the computer.

Open **Settings → Document rendering** for live status and AAAAT's rendering self-test. The self-test creates, renders and removes one temporary AAAAT-managed document through the fixed document pipeline. Missing rendering tools do not prevent editing or local ownership. AAAAT does not silently install packages or expose arbitrary command execution.

## Optional AI inside AAAAT

AI connections are optional. AAAAT validates support per bounded operation, distinguishes reachability from operation compatibility, and keeps failed AI exchanges inspectable. Effective system instructions, user/context payloads and raw model responses remain available for diagnostics where appropriate.

One malformed proposal must not discard otherwise valid field proposals. AI output remains editable AAAAT data, not authority over the workspace.

## `installer.ai` and `configurator.ai`

These names describe AAAAT's shared installation/configuration capabilities, not copy/paste prompt files and not read-only status cards.

- **`installer.ai`** exposes live workspace/rendering prerequisites and the bounded AAAAT rendering self-test.
- **`configurator.ai`** exposes optional AI configuration coverage and, when explicitly authorized, typed connection save, per-operation capability validation and validated per-operation default selection.

Status inspection is always privacy-minimal. Mutating external setup actions are denied by default. In **Settings → External assistants & portability**, the user may separately enable **installer.ai actions** and **configurator.ai actions** for the current workspace. These switches grant only the documented AAAAT product actions; they do not grant shell, package-manager, arbitrary command, filesystem, database or generic provider authority. Resetting the workspace clears this local authority with the rest of the workspace data.

The desktop uses the same underlying setup services directly. External assistants do not receive a privileged bypass around normal validation.

## External assistants and hosts

AAAAT is provider- and host-agnostic. A compatible assistant may be ChatGPT, Claude, a local agent, an editor host or another environment chosen by the user.

The packaged MCP stdio surface exposes bounded capabilities including:

- `candidature_create`
- `application_documents_create`
- `opportunity_research_context_read`
- `candidature_source_add`
- `career_context_read`
- `cv_descriptions_read`
- `cv_content_read`
- `cv_render`
- `installer_status_read`
- `installer_rendering_self_test`
- `configurator_status_read`
- `configurator_ai_connection_save`
- `configurator_ai_operation_validate`
- `configurator_ai_operation_default`

`application_documents_create` expresses the same high-level offer → CV / cover letter / both intention as the desktop and returns only created/prepared booleans, never hidden application/document IDs or local paths. Setup mutation tools require the matching explicit local Settings authority. The configurator tools accept only typed AAAAT connection/operation inputs and continue to use normal endpoint and capability validation.

These tools do not expose generic candidature/corpus browsing, database queries, filesystem access, shell/process execution, package installation, arbitrary local paths or unrelated private areas. AAAAT controls what its tools disclose; a host's own wider permissions remain a separate user trust choice.

In the packaged app, **Settings → External assistants & portability** shows the exact executable and workspace arguments to use in a compatible host's local tool settings. The host must support starting a local tool; AAAAT does not require a particular editor or provider.

## Backup and restore

Use **Settings → Backup & recovery** to create or restore a user-owned backup. Backups contain the current workspace database and relevant regular workspace files plus a validation manifest. Machine-local/transient and secret-like material is excluded.

Restore validates paths, hashes, SQLite integrity and current-schema compatibility before activation. A failed restore does not silently replace the active workspace.

AI connection configuration is intentionally excluded from workspace backups. Export/import portable AI setup separately when needed; operation validations are machine/runtime-specific and must be re-established.

## Current alpha limitations

Current alpha builds are unsigned. A Windows package is produced locally for natural-use acceptance before cross-platform and release verification. There is not yet a stable release channel, updater or code signing.
