# Install AAAAT

Normal users download the AAAAT package for their computer from a GitHub release. They do not install Python, open a terminal, run tests, publish artifacts, or keep a source checkout.

## Open AAAAT

1. Download the AAAAT ZIP for the current operating system.
2. Extract it once to an ordinary applications folder.
3. Open `AAAAT.exe` on Windows, `AAAAT.app` on macOS, or `AAAAT` on Linux.

Keep the application outside an AI host's working folder and outside a source checkout. The package contains the desktop application and paired host bridge; development and maintenance commands are not part of the normal user interface.

GitHub Release assets are direct platform ZIPs. Pull-request validation artifacts are also arranged for one extraction: GitHub supplies its artifact ZIP wrapper, and the runnable AAAAT folder is directly inside it.

## First launch

Before the dashboard opens, AAAAT shows a welcome dialog explaining the private workspace. The recommended private location is selected by default. The user may continue with it or choose another location on this computer. AAAAT remembers the choice, keeps it separate from application files and AI-host folders, and does not remove it when the application is updated.

The desktop works fully without an AI connection. Use it to review and edit the profile, opportunities, notes, and documents.

## Guided AI setup

Choose **Connect my AI** when continuing assistance is useful. AAAAT copies one provider-neutral connection request. The selected LLM assesses its own environment and chooses the strongest route it supports: native MCP or tools, a host-managed skill or plugin, an approved helper script or automation, or portable task/result exchange as the fallback.

AAAAT does not install provider software, select a provider, manage credentials, or expose the private workspace. The user sees connection state and consent in ordinary language. Provider, operating-system, command, port, credential, and protocol details remain inside the LLM host's own setup unless the user deliberately requests technical help.

For backup, recovery, or an upgrade handled by support, see [maintenance.md](maintenance.md). Those actions remain outside normal setup.
