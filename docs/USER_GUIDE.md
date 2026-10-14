# AAAAT user guide

This guide describes AAAAT `2.0.0`. Start with [Get Started](https://didacll.github.io/AAAAT/get-started.html) for a quick introduction, or [Explore AAAAT](https://didacll.github.io/AAAAT/explore.html) for independently navigable feature chapters.

## Start or switch workspaces

On Welcome, create a workspace in an empty folder, open an existing current workspace, try fictional demo data, or restore a backup. A workspace is the local home for your applications, professional information and documents.

After opening it, use the fixed left rail to move between Home, Applications, Documents, My information and Settings. Main actions follow your current work in the fixed top bar. Activity and Status open on demand rather than filling the rail with task logs.

Use **Settings → Workspace** to create or open another workspace. Reset and deletion are separate destructive actions with confirmation. Demo data lives in its own workspace. It contains 12 fictional opportunities across community programmes, editorial work, visitor services and other professions. Alex Morgan’s fictional profile includes a custom **Community work** group and a saved **Public-facing emphasis** variation. Explore the Common Ground Cooperative CV and cover letter, the standalone general CV and the **Community & communications** composition template without using personal information.

## Applications

### Create one application

Choose **Applications → New**. Source material and editable information share one screen: material on the left, fields on the right. You may paste an offer, a recruiter message, a URL-containing fragment or a note; you may also enter only the details you know. Neither side is required just to satisfy a template.

Choose **Save** to retain the application, or **Cancel** to abandon it. With a configured AI connection, **Fill** uses the supplied material for AI-enabled empty information and Tag suggestions. Manual entry remains available throughout.

### Find and inspect

Search saved information, notes and Sources. Filters limit the visible collection. Collapsed application covers prioritise the information you chose; expanding one reveals fuller content at roughly twice the width and height while other cards make room. **Open / Edit** opens ordinary application editing.

Presentation choices affect recognition, not the stored information. Favourites, ordering and Small/Regular/Large prominence belong to the same fields. Editing does not use cover typography.

### Edit with control

Use the small pencil to edit a value, the star for favourite information, the eye for AI permission, the sparkle for field assistance, and the gear for deeper options. Field help appears on demand instead of being permanently mixed with the value.

An open edit has explicit Save/Cancel actions. Moving to another work area keeps the draft without implicitly saving it. Raw material remains available under Sources; changing fields or using AI does not replace the original.

### Tags

Attach a shared Tag by name or alias. Create a missing Tag with its meaning, or edit an existing shared definition. Hover, focus or select a Tag to read its meaning in the left monitor. Cards carry names only, including when expanded.

The same Tag can be attached only once per application. AI matches to existing Tags can be attached directly when no newer manual Tag work intervened. New shared Tags remain proposals: edit their name, definition and aliases, then **Create**, or **Ignore**. Exact name/alias matches resolve to existing Tags; different names with similar meanings can still need your judgment. Edited proposals remain available when you navigate away and return.

## My information

Keep reusable professional facts here. Add, edit and arrange the information useful to you. Group names and information types are editable; shipped examples are not a closed category list. Custom groups also remain available when composing a CV.

Saved variations retain reusable alternate wording or emphasis. A CV-specific edit changes that CV alone unless you deliberately save it for reuse or update My information. Career preferences are user-stated context, distinct from factual experience.

The eye controls whether AI may use an item. Storing it locally or showing it prominently does not grant that permission.

## Documents

Start a CV from My information, a saved template or a blank page. Start a cover letter independently or inside an application. Opening a new document creates a provisional editor; Save keeps it, Cancel abandons it. Application names provide context in the document collection.

Compose a CV by editing information, arranging sections and choosing the wording you want. Section names are yours to change. Templates preserve reusable composition; Main/Secondary roles are presentation hints, not fixed left/right columns. Save-back controls distinguish reuse from edits to the current document.

Choose **PDF** in the top bar to generate output. Within an application, select its CV and letter and use the application top-bar PDF action to create one combined file. Generated files remain separate from editable documents. Their retained project includes the source needed to reproduce them.

Saved documents have a secondary **Remove** action with confirmation. Removing an editable CV or letter preserves independently generated output; it does not delete an already produced PDF. Opening a generated CV for editing prepares a new provisional copy rather than rewriting that output.

**Settings → Documents** shows PDF readiness and optional diagnostics. Choose **PDF setup** to install the supported TeX distribution for your device; an existing installation is reused. Editing works without it. Downloads require your explicit selection. See [installation](INSTALLATION.md).

### Prepare PDF generation

AAAAT uses **pdfLaTeX** (the `pdflatex` executable supplied by a TeX distribution) to render CVs, letters and combined application PDFs. Editing these documents does **not** require pdfLaTeX; generating a finished PDF does.

1. Open **Settings → Documents**. Inspect the current PDF readiness status. Select **PDF setup** when `pdflatex` is not available.
2. Under **Make AAAAT ready for you**, choose **PDF generation** and **Set up**. AAAAT opens the native TeX distribution installer or software manager for your platform: MiKTeX on Windows or Intel Mac, BasicTeX on Apple Silicon, and TeX Live on Linux.
3. If you have your own installation, expand **Locations**, choose **pdfLaTeX → Browse**, select `pdflatex` (or `pdflatex.exe` on Windows), and **Save**. AAAAT can reuse this instead of installing the suggested distribution.
4. Return to **Settings → Documents**, choose **Refresh**, and use **Check PDF** to verify that rendering is available. The compiler being installed does not guarantee that every third-party LaTeX package or custom Blueprint will compile.
5. Open an editable document and choose **PDF**. Check the result in **Documents → Generated files**. The editable document and previously generated outputs remain separate.

See [installation](INSTALLATION.md) for prerequisites and platforms, and the [website PDF guide](https://didacll.github.io/AAAAT/explore.html#pdf) for every UI step.

### Personalise the design with a Blueprint

A **CV template** saves reusable content and composition. A **Blueprint** is different: it is a `.tex` file controlling how CV sections and items appear on the page. AAAAT supplies **AAAAT Default**, and advanced users may add their own.

1. Copy the [built-in Blueprint source](../src/main/latex/default-blueprint.tex) and modify a copy in your preferred LaTeX/text editor. The [shared AAAAT package](../src/main/latex/aaaat.sty) documents the relevant rendering commands.
2. Save it as a named `.tex` file inside the `blueprints` folder of AAAAT's **application configuration** location (Electron `userData`; not inside a career workspace).
3. Reopen the CV editor, expand **Document options**, and select your named file from **PDF style**. This choice is offered when more than one Blueprint is available.
4. Choose **PDF** and inspect the result. If your custom TeX fails, correct it or select **AAAAT Default** to return to the built-in layout.

The **Header**, **Main body**, **Secondary body**, and **Footer** section positions are semantic composition hints interpreted by the Blueprint. They do not force a permanent two-column design. AAAAT is not an in-app LaTeX IDE.

### Export and modify an entire document outside AAAAT

1. Open **Documents → Generated files**, or a retained generated file inside its application, and choose **Export source project**.
2. Choose a writable destination. AAAAT exports a separate copy of the actual retained PDF project, leaving the managed original intact.
3. Edit the exported LaTeX in another program. Current generator entry files are typically `cv.tex`, `cover-letter.tex`, or `application-document.tex`, with `aaaat.sty` in the project.
4. Recompile using the matching `pdflatex` command in that exported folder, such as `pdflatex cv.tex`. The document and any required TeX packages must be supported by the installed distribution.

Changes to the exported copy do not update AAAAT's working CV or earlier retained PDFs. This is intentional: the user owns both the original output and any separately modified version.

## Optional AI

### Connect a model

In **Settings → AI**, add a named connection, its endpoint, model and credential when needed. The current adapter uses OpenAI-compatible chat completions. Loopback HTTP and remote HTTPS are accepted. Choose the connection AAAAT will use for assistance.

The optional connection check reports reachability without changing the selected connection. There are no per-feature checks or routing prerequisites. A reachable server may still return an invalid or unhelpful result. Instructions are editable **per AI action**, not just as one permanent instruction for every job. Under **Settings → AI → AI instructions**, open an action, read **Context AAAAT sends** and **Expected response**, edit **Effective instruction**, then **Save**. Choose **Reset to shipped default** to undo a change; the **Shipped default** can be inspected before resetting.

**Local AI** installs the llama.cpp **CPU runtime** with the tested **IBM Granite 4.1 3B Q4_K_M** model (about 2 GB of download, plus runtime storage and working memory). Actual inference speed and response quality depend on the computer and the task. The locally offered package may be unavailable on some devices; direct compatible connections and text-capable LLMs through copy-paste remain available.  A workspace without connections receives **Local Granite** automatically. Existing connections are preserved. The installed server starts with AAAAT and stops when AAAAT quits. **Startup** holds its editable script, an on/off choice and **Use installed default**; saved changes apply on the next launch. Other servers remain under your own control.

### Use it beside your work

Application **Fill** populates supported empty, AI-enabled fields. Existing values and newer manual edits remain protected. A field sparkle requests focused help. Document assistance uses allowed My information and application context; the application's document AI permission must also be enabled. The document editor's **Context** control shows prepared context on demand.

Results are editable. A CV response that arrives after a newer manual edit stays a separate draft to use or dismiss. Do not treat a fluent answer as a verified fact.

### Use another AI environment

Open **⋯ → AI task** inside the relevant application and choose a request. **Application details** prepares help for missing AI-enabled information; the demo’s sparse Library services recruiter message is a useful example. Edit the entire request, including its context. **Copy** and **Export** use exactly that text. Closing or navigating preserves the local draft and does not send it.

Connected reads require a separate explicit choice. Editing the request turns future reads off. Turning permission off stops future access through that route; it cannot undo an earlier model request or recall copied information.

Interview work is an optional request in this secondary application-linked editor. The request stays fully editable; AAAAT does not prescribe model advice. Returned text can be deliberately retained as an application Source.

For a compatible local assistant host, **Settings → AI → Connect another AI to AAAAT** provides the executable/workspace arguments. The current integration uses bounded MCP tools for application, document and setup intentions. It grants no generic database, filesystem or shell access. Separate setup permissions enable only the named setup actions; selecting a connection does not require model certification. Current registrations are defined in [the MCP server](../src/main/mcp-server.ts), rather than a frozen tool-count checklist.

## Reset, workspace folders and portable setup

Use **Settings → Workspace → Reset** to clear applications, My information, or both. Generated PDFs and source projects remain. Shared Tags and settings remain. Existing document content is kept when reusable My information is cleared.

You can also keep a copy of the workspace folder and reopen it. Close AAAAT before copying it so the database is no longer being written.

### Backup and portable setup

Use **Settings → Backup** to create a backup or restore one into an empty destination. Restore validates the snapshot and retained files before activation. A failed restore must not replace the active workspace.

Backup is a directory containing `workspace.sqlite`, retained files and a manifest with hashes. AI connection configuration and credential material are excluded. Export/import AI setup separately in **Settings → AI**; connection diagnostics are local to the current environment.

Generated documents also expose **Export source project**. It copies the retained project, leaving the managed original intact. Advanced Blueprints choose presentation at render time and live in application-level configuration; CV templates choose content/composition.

## If something is unavailable

| Symptom | Where to look |
| --- | --- |
| AI action cannot run | Settings → AI: saved default, endpoint, model and the action's error |
| AI supplied unusable information | Edit or dismiss the proposal; inspect the exchange on demand |
| PDF cannot be generated | Settings → Documents: `pdflatex` availability and rendering error |
| Earlier prototype or development workspace will not open | Create a new workspace; AAAAT 2 does not import the earlier prototype |
| Need to undo an unfinished edit | Its explicit Cancel action; navigation alone preserves the draft |

Download installers and portable packages from [Releases](https://github.com/DidacLL/AAAAT/releases). Packages are unsigned and there is no automatic updater. See the [installation guide](INSTALLATION.md), or [build from source](../README.md#build-from-source).

Please report problems with fictional examples. Keep real workspaces, career documents and credentials out of public issues; see [Security](../SECURITY.md).
