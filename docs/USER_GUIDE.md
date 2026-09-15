# AAAAT alpha user guide

AAAAT is a private local career and application workspace. Your workspace is a folder you choose. Core use does not require AI.

## Start with the thing you are trying to do

After opening a workspace, AAAAT puts ordinary intentions first:

- **From a job offer** — paste a raw vacancy, recruiter message or useful fragments and create a tailored CV, a cover letter, or both. AAAAT retains the raw material as a Source and creates the underlying application context automatically. You do not need to create, name or remember a candidature first.
- **CV & cover letter** — create or continue standalone documents without an application context.
- **Saved applications** — recall retained opportunities/application contexts and inspect their Sources, information, Tags and linked material.
- **My information** — maintain reusable experience, education, projects, skills, languages, links, preferences and other career information.
- **Settings** — workspace ownership/recovery, local rendering, optional AI connections and bounded external-assistant setup.

The shell uses these intentions as navigation. Internal database entities do not define the normal journey.

## From a job offer to application documents

Open **From a job offer**, paste the raw offer, and choose **Tailored CV**, **Cover letter**, or both. Select **Start application documents**.

AAAAT then:

1. retains the pasted material as the original local Source;
2. creates the underlying application context without asking you to file it first;
3. creates the selected local document project(s);
4. links the documents to the application context;
5. opens document work directly; and
6. when the required AI routes are already validated and usable, starts the bounded preparation work automatically in the background: it extracts safe structured opportunity facts, keeps independently valid facts, selects relevant retained career evidence for the CV, and/or stores a grounded cover-letter draft.

Slow AI work does not block the rest of AAAAT. Progress and the final prepared state appear in the document itself; you do not need to discover another AI button. If AI is unavailable, unsupported, or produces no safe opportunity facts, the retained Source and created documents remain complete ordinary editable work rather than a failed application flow.

The raw Source remains available later under **Saved applications**.

## Standalone CV and cover-letter work

Open **CV & cover letter** when there is no job offer or when you simply want to work on a document.

AAAAT uses reusable **My information** and keeps generated LaTeX projects user-owned. Document content remains editable without AI. Rendering is local when compatible TeX tools are available.

Inside a CV, the effective information actually used by the document is the primary view. Inside a cover letter, the letter text itself is primary. Saved variations, per-item inclusion/order/overrides, external-assistant access, source/LaTeX ownership and other advanced controls remain available through progressive disclosure instead of defining the normal editing model.

## Saved applications and Sources

**Saved applications** is primarily for recall. Applications may be sparse: a raw Source alone is valid.

Sources are first-class retained material such as job postings, recruiter messages, forms, notes or research. Tags provide reusable recognition/glossary information. Flexible application information remains user-maintainable rather than fixed to one profession.

The complete application surface may expose richer information and advanced controls progressively, but the ordinary journey does not require understanding field/schema machinery.

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

### Optional VS Code adapter

VS Code is one optional demonstrated adapter over the same MCP contract. It is not a product dependency and does not define AAAAT's integration model.

Technical setup remains available for users who want it:

```text
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project>
AAAAT --vscode-mcp-setup --workspace <existing-AAAAT-workspace> --project <VS-Code-project> --activate
```

## Backup and restore

Use **Settings → Backup & recovery** to create or restore a user-owned backup. Backups contain the current workspace database and relevant regular workspace files plus a validation manifest. Machine-local/transient and secret-like material is excluded.

Restore validates paths, hashes, SQLite integrity and current-schema compatibility before activation. A failed restore does not silently replace the active workspace.

AI connection configuration is intentionally excluded from workspace backups. Export/import portable AI setup separately when needed; operation validations are machine/runtime-specific and must be re-established.

## Current alpha limitations

Current alpha builds are produced by the repository's successful Verify workflow and are unsigned. There is not yet a stable release channel, updater, code signing/notarization, Windows installer, macOS DMG, or broad Linux package portfolio.
