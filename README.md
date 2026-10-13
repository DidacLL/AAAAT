<p align="center"><img width="420" alt="aaaat-log" src="https://github.com/user-attachments/assets/9dc35ba8-c2eb-4687-9004-7837afc41079" />

</p>

# Agent-Agnostic Auto Application Tracker

### Less retyping. More ready-to-send applications.

Keep an offer, find it when the recruiter calls, and turn your own career information into a CV and cover letter. **AAAAT is a local desktop workspace: your information, your documents, your choice of AI.**

[Quick tour](#a-quick-tour) · [User guide](docs/USER_GUIDE.md) · [Advanced use](#a-little-more-control) · [Build from source](#run-the-current-preview)

**Current version: `2.0.0-alpha.0`.** This repository contains the v2 preview. There are no published downloadable releases yet; [Releases](https://github.com/DidacLL/AAAAT/releases) is where future packages will appear. The current preview can be [run from source](#run-the-current-preview).

<p align="center"><img width="2172" height="724" alt="image" src="https://github.com/user-attachments/assets/d609b279-8ee9-451c-95be-5b4cedfdc5af" /></p>


## Make the useful things easy

| You want to… | AAAAT gives you… |
| --- | --- |
| Keep something before you forget it | One application screen for pasted material and editable details |
| Recognise the right opportunity quickly | Content-driven typographic covers, search and a richer expanded card |
| Understand a term without leaving the application | Shared Tags with definitions in the left monitor |
| Stop rewriting your career history | Reusable information, saved wording variations and CV templates |
| Make a document your own | Independent CV and letter editors, application-specific copies and PDF output |
| Get help without giving up control | Optional AI beside the task, editable results and information-level permissions |

You can keep a single note or build a detailed application. There is no completeness score, required application stage or maintenance routine to keep up with. You can also open AAAAT just to write a CV or letter.

## A quick tour

### 1. Give your work a home

Open AAAAT and **Create workspace** in an empty folder, or **Open existing workspace**. **Try with demo data** gives you fictional applications to explore separately from your own work.

The left rail takes you to **Home**, **Applications**, **Documents**, **My information** and **Settings**. The fixed top bar holds the actions for your current work; the centre is for the information itself.

### 2. Keep the offer and the details together

In **Applications**, choose **New**. Paste the offer, recruiter message or your notes on the left; enter any useful details on the right. You can use either side or both. **Save** keeps the application. **Cancel** abandons the draft.

Have an AI connection? **Fill** can use your source material to populate empty, AI-enabled fields and suggest Tags. You can still type normally. Existing values and newer manual edits are protected; proposed changes that need your choice stay available for review.

The original material remains a Source. Extraction does not replace it.

### 3. Find it at a glance

Search across saved application information and Sources. Each application's cover adapts to its actual text and the prominence you choose, so a short company name and a detailed role do not become identical empty boxes.

Expand a card for fuller context; neighbouring cards make room. Choose **Open / Edit** for ordinary readable editing. The cover treatment belongs to the cards, not your form.

Small field controls keep the useful choices close:

| Control | What it does |
| --- | --- |
| ★ | Put information among your favourites |
| 👁 | Choose whether AI may use that information |
| ✨ | Ask AI to help with that field |
| ✎ | Edit its value |
| ⚙ | Adjust its presentation or definition |

Tag names stay compact on the cards. Hover, focus or select one to read its shared definition in the left monitor. Improving that definition improves it everywhere the Tag is used.

<p align="center"><img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/55d7b25a-b9fe-4400-91c4-5045973738ba" /></p>

### 4. Write once, reuse thoughtfully

In **My information**, keep the career facts you want to reuse: contact details, experience, projects, skills or anything else that matters to your work. The supplied groups are starting points. You can rename them and add your own.

Save an alternate wording as a variation when you want to reuse it. Change something only in a CV when it belongs only in that document. Updating your reusable information is a separate, deliberate choice.

### 5. Build the document you need

Open **Documents** to start a CV from My information, a template or a blank page, or to write a cover letter. You can also create them inside an application so they remain easy to find together.

Opening a new editor prepares a draft. **Save** keeps it; **Cancel** lets you leave without creating an unwanted document. Names include useful application context when available.

Edit content, arrange sections, and choose **PDF** when you are ready. Within an application, the top-bar **PDF** action combines the selected CV and letter. Editable documents and generated files remain separate, so later edits do not rewrite a PDF you already produced.

Choose **PDF generation** during optional setup, or **Settings → Documents → PDF setup** later. AAAAT uses an existing installation when available. You can keep editing while PDF setup downloads.

### 6. Leave and come back

Ordinary navigation keeps unfinished work available without silently saving it. Use **Save** to commit an edit and **Cancel** to discard it.

Use **Settings → Backup** to make a portable workspace backup. Restore into an empty folder. AI connection configuration has its own import/export in **Settings → AI**.
<p align="center"><img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/e29a383a-5872-4104-953f-0ef4288e39da" /></p>

---

## A little more control

The desktop workflow above needs no programming or AI knowledge. The options below are for people who want to choose their model, understand disclosure or work directly with portable document files.

### Bring your own AI

In **Settings → AI**, add a named connection with an endpoint and model, plus a credential if that server requires one. Set the general default, or choose a checked connection for an individual operation.

For an easy local start, choose **Local AI** during optional setup or in **Settings → AI**. This downloads llama.cpp and the tested Granite 4.1 3B Q4 model (about 2 GB). AAAAT starts this installed model when needed and stops its own server when you quit. A new workspace without another connection gets **Local Granite** automatically; existing connections stay as you chose them.

You can also connect your own server. The current adapter uses an OpenAI-compatible chat-completions endpoint. Loopback servers may use HTTP; remote endpoints must use HTTPS. For example, a local compatible server may expose `http://127.0.0.1:8080/v1`. You manage independently installed servers yourself.

Normal AI use does not require running all feature checks first. Connection and per-feature checks are optional diagnostics; reachability is different from producing useful, valid results. Instructions for application information, Tags, CV writing and letters are editable, with a reset to the shipped default.

AI is optional information processing. AAAAT validates returned structure and keeps results editable; it cannot guarantee the model's factual accuracy or recognise every synonymous Tag. A repeated existing Tag is attached only once. A new name with an overlapping meaning remains a proposal you can edit or dismiss.

### Decide what can leave the workspace

Local storage, cover prominence and AI permission are separate choices. Starring a field does not share it; keeping it private from AI does not hide it from you.

Application document assistance uses the application's document-access control as well as the permissions on reusable information. **Context** in the document editor lets you inspect the prepared context on demand. A permitted AI action sends that context to your configured server; a remote server's handling of it belongs to that provider.

For work in another AI environment, open the application's **⋯ → AI task**. Edit the complete request before **Copy** or **Export**. Those actions use the visible text. Connected reads are a separate explicit option for future access; turning them off cannot recall anything already sent or read.

Interview requests live in that secondary application-linked editor. They are fully editable and optional. AAAAT supplies application context, not advice or a prescribed interview workflow.

### Work from another assistant

**Settings → AI → Connect another AI to AAAAT** provides the executable and workspace arguments for a compatible local host. The current transport includes MCP over standard input/output.

Supported intentions include Source-backed application creation, prepared application requests and returned proposals, deliberately selected document work, and optional setup actions. Permissions still apply, and changes go through the same application services as desktop work. This is a bounded entrance to AAAAT, not unrestricted access to the database, files or shell.

Host-specific setup varies. The current refinement has been exercised through the desktop with a real local model; the revised third-party-host journey still needs fresh verification.

### Own the output, including the source

Generated document projects retain the PDF, encoded document data, the exact presentation source and the shared `aaaat.sty` package used to produce them. **Export source project** copies a retained project for editing or reproduction outside AAAAT.

Advanced presentation files are called **Blueprints**. They live in application-level configuration and are chosen at render time. A CV template chooses content and composition; a Blueprint chooses presentation. Your CV sections can be renamed, reordered and assigned Main/Secondary roles without hardcoding a profession's taxonomy.

The rendering path is TypeScript-generated document data → LaTeX presentation → bounded `pdflatex` execution. Editing a saved document does not change an older generated artifact. Removing its editable source does not remove an independently retained PDF.

### Keep backups separate from configuration

A workspace backup contains a consistent SQLite snapshot and retained workspace files. It uses an inspectable directory with a manifest and file hashes. Machine-local AI configuration and credential material are excluded; portable AI setup is exported separately.

The v2 preview has no established real-user upgrade baseline. Development-era workspaces can become incompatible when the current schema changes. Keep any material you need in user-owned exports and backups; this preview does not provide a legacy-schema migration programme.

## Run the current preview

For source users: Node.js **24.15 or later within major 24**, and npm **11.12 or later**. npm 11 and 12 are supported.

```sh
git clone https://github.com/DidacLL/AAAAT.git
cd AAAAT
npm ci
npm start
```

To make a native package for the current machine:

```sh
npm run make
```

Packages appear under `out/make/`. Windows builds additionally require [Inno Setup 6](https://jrsoftware.org/isdl.php); a compiler outside its standard location can be selected with `ISCC_PATH`. The release workflow builds native Windows setup EXEs, macOS DMGs and Linux DEBs, each on x64 and ARM64, plus portable ZIPs. Preview packages are unsigned and there is no automatic updater.

Optional setup installs MiKTeX for PDF generation on Windows and x64 macOS/Linux. Apple Silicon uses BasicTeX; Linux ARM64 uses TeX Live. Downloads start only after you select them. See [installation details](docs/INSTALLATION.md) for supported systems, download sources and permissions. Neither AI nor PDF setup blocks ordinary application work or document editing.

## Help improve AAAAT

[Report a problem](https://github.com/DidacLL/AAAAT/issues) with what you tried, what happened and a small fictional example. Keep personal applications, documents and credentials out of public issues. For sensitive reports, see [Security](SECURITY.md).

AAAAT is a personal open-source project maintained by one developer with AI assistance. Its scope stays deliberately small: useful applications and documents, local ownership, optional AI and clear control.

[Detailed guide](docs/USER_GUIDE.md) · [Technical architecture](docs/SPEC.md) · [Contributing](CONTRIBUTING.md) · [Product definition](PRODUCT_DEFINITION.md)
