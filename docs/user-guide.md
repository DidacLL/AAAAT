# User Guide

## Install and open

Download the archive for your operating system from the project release page.
Extract it once, open the platform folder, and start AAAAT:

- Windows: open `AAAAT.exe`.
- macOS: open `AAAAT.app`.
- Linux: open `AAAAT`.

No Python installation, terminal, source checkout, or Git installation is required
for normal use.

## Choose the private workspace

On first launch, AAAAT suggests a private workspace location. Accept it or choose
a different local folder.

Use a folder that:

- is owned by you;
- is outside the installed AAAAT folder;
- is outside folders shared with an AI host;
- is included in your normal local backup routine if you want backups.

The workspace contains the application database and generated private files.

## Welcome View

Welcome View provides orientation and workspace status. From here you can:

- confirm the current private workspace;
- begin entering professional context;
- add a candidature;
- open the main working views;
- optionally prepare an external-AI connection.

Normal operation does not require protocol or provider configuration.

## Build your professional context

Open User View and add the information you want AAAAT to reuse:

- name and contact details;
- location and work preferences;
- portfolio and professional links;
- summaries;
- skills;
- education;
- relevant experience;
- target roles and markets;
- constraints and career objectives.

Add only information you are comfortable keeping in the local workspace. You can
edit it later.

AAAAT may use this context when rendering documents or preparing bounded work for
an external AI. Only purpose-relevant information is included in a work item.

## Create a candidature

Create a candidature from an offer, pasted description, or manually entered
information.

Paste or enter whatever is already available. Raw offer or form text alone is enough to create a candidature. Company, role, URL, location, keywords, and preparation fields may remain empty and can be completed later manually or by optional assistance. AAAAT does not insert invented placeholder facts.

## Smart View

Use Smart View during recruiter calls or whenever you need a quick operational
summary.

The overview shows current candidatures. Selecting one displays the compact
preparation context, including available items such as:

- company, role, status, and priority;
- next action;
- pitch;
- smart questions;
- risks to avoid;
- preparation order;
- keywords and definitions;
- notes;
- current artifacts.

Click a keyword to show its meaning without losing the selected candidature.
Use the notes area for information captured during a call.

## Detailed View

Use Detailed View for complete candidature inspection and deliberate editing.

Detailed View includes fields that are too extensive for the call-oriented Smart
View, such as research, form answers, evaluation details, preparation material,
and artifact metadata.

Columns can be adjusted for the current task. Selecting a candidature keeps its
full detail panel available for editing.

## Application material

AAAAT can store and render candidature-specific material, including:

- CV variants;
- cover letters;
- recruiter messages;
- form answers;
- interview guides;
- preparation sheets.

Generated material is stored directly as current working material. Artifact states help organize what is current, sent, or archived; they do not require a separate approval step. AAAAT keeps the useful current artifact visible and retains older versions only when they have been saved.

## Optional AI connection

Choose **Connect my AI** when you want an external AI to help with bounded work.

AAAAT first offers a direct connection request:

1. Copy the request.
2. Paste it into the AI host you already use.
3. The host checks whether AAAAT tools are already available or whether it can genuinely launch and reach the supplied local bridge.
4. When that live route is reachable, the host initializes it and works through AAAAT's bounded tools.
5. When the host cannot reach your computer, it must not pretend that the local command will work. Continue with **AI exchange** instead.

AAAAT does not ask for an AI provider, API key, model name, or model URL.

## AI exchange files

Use the **AI exchange** page when a direct connection is unavailable:

1. Select a candidature in Smart or Detailed View.
2. Choose **Create task file for selected candidature**.
3. AAAAT writes one bounded JSON task file under `AAAAT Exchange/pending` in your private workspace.
4. Upload that task file to the AI.
5. Ask the AI to return the exact JSON result filename declared in the task file.
6. Save or move the returned file into `AAAAT Exchange/results`.
7. AAAAT checks that folder automatically, validates the result, applies accepted items, and moves files to `processed` or `rejected`.

The task file contains only the complete purpose-specific work items and their single-use callback capabilities. It does not expose your database, workspace path, unrelated candidatures, or general mutation authority.

When an AI cannot generate files, copy its complete response and choose **Import copied AI response**. AAAAT reads only one result object between the supplied `<AAAAT_RESULT>` tags and ignores surrounding conversation. This tagged-text route is the final compatibility fallback, not the preferred exchange method.

## Connection status

AAAAT shows one of four simple live-connection states:

- **Ready to connect** — connection material is available.
- **Connected** — the direct bridge has recent successful activity.
- **Needs attention** — direct setup exists but recent activity indicates a problem.
- **Paused** — direct assisted work is disabled until you resume it.

AI exchange files remain an independent bounded carrier when no live connection is active. You do not need to run a connection test suite.

## Pause or disconnect

Pause the direct connection when you do not want the external host to claim new work.
Manual desktop operation and explicit AI exchange remain available.

Connection material can be regenerated if necessary. Old or invalid capabilities
are not general access to the workspace.

## Backup

Close AAAAT before making a manual filesystem backup. Copy the complete private
workspace folder to your chosen backup location.

Keep the database and artifact folders together. Do not place backups in the
source repository or a public issue.

## Restore

To restore:

1. place the backed-up workspace in a local folder;
2. open AAAAT;
3. choose the restored workspace when prompted or through workspace selection;
4. confirm that candidatures and artifacts appear.

Do not edit the SQLite database directly.

## Upgrade AAAAT

Download and extract the new release separately from the previous application.
Open the new application and select the existing private workspace.

Keep the previous application folder and a workspace backup until the new release has opened successfully.

## Privacy reminders

- Do not commit the private workspace to Git.
- Do not attach real workspace databases or private documents to public issues.
- Use fictional information in bug reproductions.
- Keep the workspace outside folders exposed broadly to an AI host.

## Troubleshooting

If AAAAT does not open, keep the extracted platform folder intact and confirm that
you are starting the application from that folder.

If a workspace cannot be opened, restore from a backup rather than manually
changing database files.

If optional AI assistance needs attention, use AI exchange or continue manually.
Your candidature data and desktop workflows do not depend on the AI connection.
