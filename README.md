# AAAAT

AAAAT is a local desktop workspace for managing job applications, preparing recruiter and interview conversations, and producing candidature-specific application material.

It keeps the practical job-search record in one private place: opportunities, source text, current status, next actions, notes, professional context, research, form answers, CV and cover-letter material, and generated artifacts.

AAAAT remains fully usable without an AI connection.

[![CI](https://github.com/DidacLL/AAAAT/actions/workflows/ci.yml/badge.svg)](https://github.com/DidacLL/AAAAT/actions/workflows/ci.yml)
[![GPLv3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)

![AAAAT desktop using fictional candidature data](docs/assets/aaaat-desktop.svg)

## Why AAAAT

Job-search information is commonly split across spreadsheets, notes, chat histories, documents, and provider-specific AI tools. AAAAT combines the operational tracker, reusable professional context, local document rendering, and optional external reasoning without surrendering the workspace to a cloud service or a particular model provider.

AAAAT is not an LLM wrapper, chat client, MCP product, or agent orchestrator. The application owns local data, rendering, artifacts, and bounded access. An external LLM may supply reasoning, research, extraction, and writing through the connection method supported by its own host.

## Main workflows

- Create a candidature from an offer, form, link, conversation, or manual entry.
- Save incomplete records immediately; unknown values remain empty and can be completed later.
- Use Smart View during recruiter calls for pitch, questions, risks, keywords, notes, artifacts, and next action.
- Use Detailed View for complete candidature inspection and editing.
- Maintain reusable profile, skills, experience, preferences, and career direction in User View.
- Render and retain CV, cover-letter, form-answer, recruiter, and interview material locally.
- Continue every core workflow manually when no AI is connected.

## Local-first privacy

AAAAT stores its authoritative SQLite database and private artifacts in a user-selected local workspace separate from the installed application.

Optional external assistance receives only purpose-scoped context and bounded operations. It does not receive general database access, workspace paths, repository access, arbitrary record browsing, or desktop mutation authority. Privacy is enforced by the local data model and inaccessible command surfaces, not by requiring the user to review every AI step.

## Optional external AI

When assistance is useful, AAAAT can prepare a connection request for the AI environment the user already has. The installed product supplies one skill named `AAAAT`, an opaque connection capability, a small bounded tool catalogue, and portable task/result exchange as a fallback.

Valid bounded results are applied directly to the intended local records. AAAAT does not add a mandatory approval or suggestion-review workflow. The user can edit resulting data normally, mark material as sent, or archive obsolete versions.

AAAAT does not request provider credentials, model URLs, model names, or provider SDKs.

## Installation

Download the archive for your platform, extract it once, and open the application:

- Windows: `AAAAT.exe`
- macOS: `AAAAT.app`
- Linux: `AAAAT`

Normal use does not require Python, Git, a terminal, or a source checkout. See the [User guide](docs/user-guide.md).

## Technical outline

```text
wx desktop
    ↕
AAAAT services and private SQLite workspace
    ↕ optional bounded tasks/results
external LLM host
```

The core uses Python and SQLite. wxPython provides the desktop adapter. PyInstaller is used for native packaging. Core runtime dependencies are otherwise kept empty.

The human-facing documentation is:

- [Product definition](docs/product.md)
- [User guide](docs/user-guide.md)
- [Architecture](docs/architecture.md)
- [Optional AI integration](docs/ai-integration.md)
- [Development](docs/development.md)
- [Releasing](docs/releasing.md)

`AGENTS.md` contains repository-development constraints only and is excluded from installed releases. The installed LLM-facing instruction is `aaaat/SKILL.md`, named `AAAAT`.

AAAAT is licensed under GPLv3 or later. See [LICENSE](LICENSE).
