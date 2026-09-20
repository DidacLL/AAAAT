# AAAAT alpha user guide

AAAAT keeps applications, reusable professional information, CVs and cover letters in a local folder you choose. AI is optional.

Welcome appears first. You can continue with the last workspace, create or open another workspace, try demo data, or restore a backup. Once a workspace is loaded, the left rail is the main navigation and continuously shows compact **Data**, **AI** and **PDF** status.

Use **New application** to paste an offer, message or note and/or fill the details you know. Save works with sparse information. In the same screen you may select **Parse with AI**, **Dedicated CV** and **Cover letter**. AAAAT saves the application first, then performs only the optional work you selected. A failed or unavailable AI connection does not lose the application.

**Applications** opens Focus over everything you retained. **All data** shows the same applications as a compact register. **CVs** is for reusable CV work; cover letters normally stay with their application, while standalone letters remain available as a secondary option. **My information** keeps reusable professional facts.

The application grid can search retained notes, Sources and useful details. Opening an application shows what you saved and its linked CV or letter. Empty fields are fine. An offer is one possible input, never a required workflow.

## My information

Use **My information** for reusable career material. The normal view is the information itself. Saved item-level variations, AI-use permission and other secondary controls appear only when relevant.

AAAAT keeps local storage, presentation/Focus choices and AI-use permission as separate concepts. Information is not sent to AI merely because it is stored locally.

## Workspaces, demo data and reset

On first launch:

- **Create workspace** chooses an empty local folder.
- **Open existing workspace** opens a current compatible AAAAT workspace.
- **Try with demo data** creates a clearly marked fake workspace without injecting fake records into real work.
- **Restore a backup** restores into a separate empty destination.

**Settings → Workspace** shows the current workspace and provides create/open, reset and deletion actions. Reset and deletion are destructive and require confirmation.

## Settings

Settings has exactly four top-level tabs:

- **Workspace** — current workspace identity, create/open another workspace, reset and deletion.
- **AI** — AI connections, capability validation/routing, diagnostics, effective instructions, portable AI setup, and advanced bounded external-assistant connection/authorization controls.
- **Documents** — local PDF readiness, `latexmk` / `pdflatex` status, setup guidance and the fixed rendering self-test.
- **Backup** — workspace backup and restore/recovery.

There is no separate Settings overview or external-assistants destination.

## Local PDF rendering

AAAAT owns document data and generated portable output. Local PDF rendering uses compatible `latexmk` and `pdflatex` commands already available on the computer.

Open **Settings → Documents** for live PDF status and AAAAT's rendering self-test. The self-test uses the fixed AAAAT rendering pipeline. Missing rendering tools do not prevent editing or local ownership. AAAAT does not silently install packages or expose arbitrary command execution.

## Optional AI inside AAAAT

AI connections are optional. **Settings → AI** owns connection names, endpoint/model editing, general/default routing, per-operation validation, diagnostics, effective instruction transparency and portable AI setup import/export.

AAAAT validates support per bounded operation, distinguishes reachability from operation compatibility, and keeps failed AI exchanges inspectable. A reachable connection remains saved even if one operation is incompatible. One malformed proposal must not discard otherwise valid field proposals. AI output remains editable AAAAT data, not authority over the workspace.

## `installer.ai` and `configurator.ai`

These names describe AAAAT's bounded setup capabilities, not provider plugins or copy/paste prompts.

- **`installer.ai`** exposes privacy-minimal setup/rendering status and, only when authorized, AAAAT's fixed rendering self-test.
- **`configurator.ai`** exposes privacy-minimal AI configuration coverage and, only when authorized, typed connection save, per-operation capability validation and validated per-operation default selection.

Status inspection remains available without mutation authority. Under **Settings → AI → Advanced: connect an external assistant**, the current workspace may separately enable **installer.ai actions** and **configurator.ai actions**. These switches grant only the operations above. They do not grant shell, process, arbitrary command, package-manager, filesystem, database, credential or generic provider-option authority.

The desktop's own **Settings → Documents** rendering self-test remains a local UI action; the installer switch authorizes the corresponding external-assistant mutation only.

## External assistants and hosts

AAAAT is provider- and host-agnostic. In the packaged app, **Settings → AI → Advanced: connect an external assistant** shows the executable and workspace arguments for a compatible host that can start a local tool.

The current MCP stdio surface registers exactly these bounded tools:

- `candidature_create`
- `application_documents_create`
- `opportunity_research_context_read`
- `candidature_source_add`
- `career_context_read`
- `installer_status_read`
- `installer_rendering_self_test`
- `configurator_status_read`
- `configurator_ai_connection_save`
- `configurator_ai_operation_validate`
- `configurator_ai_operation_default`

`application_documents_create` expresses the same high-level offer → CV / cover letter / both intention as the desktop and returns only bounded outcome information, never hidden application/document IDs or local paths. Setup mutation tools require the matching explicit local Settings authority. Configurator tools accept only typed AAAAT connection/operation inputs and continue to use normal endpoint and capability validation.

These tools do not expose generic candidature/corpus browsing, database queries, filesystem access, shell/process execution, package installation, arbitrary local paths or unrelated private areas. AAAAT controls what its tools disclose; a host's own wider permissions remain a separate user trust choice.

## Backup and restore

Use **Settings → Backup** to create or restore a user-owned workspace backup. Restore validates the backup before activation and warns before replacing current workspace data. A failed restore does not silently replace the active workspace.

AI connection portability belongs in **Settings → AI**, not Backup. Portable AI setup carries connection configuration; capability validations are local/runtime-specific and must be re-established after import.

## Current alpha limitations

Current alpha builds are unsigned. A Windows package is produced locally for natural-use acceptance before cross-platform and release verification. There is not yet a stable release channel, updater or code signing.
