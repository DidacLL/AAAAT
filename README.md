# AAAAT

AAAAT is a private desktop workspace for job research, applications, interview
preparation, and the documents that support them. It works on its own and can
optionally keep a conversation with a capable AI host aligned with that local
workspace.

The normal Windows release is an installer or portable folder. It does not ask
you to install Python, use a terminal, run tests, or keep a source checkout.

## Start using AAAAT

1. Install AAAAT, or unzip the portable release and open `AAAAT.exe`.
2. On first use, choose where AAAAT keeps your private workspace. The default
   is in your Windows local application data, outside the app installation and
   outside any AI-host folder.
3. Add your profile and review opportunities in the desktop app.
4. If you want continuing AI assistance, choose **Connect my AI**. AAAAT gives
   your AI host only a paired local bridge. The host can connect when it
   supports local tools; otherwise it should say plainly that it is not
   connected and you can continue in the desktop app.

The normal interface never asks you for a database location, command, internal
identifier, or provider credential. The AI host chooses its own provider,
model, and permitted host configuration; AAAAT retains local validation and
the final desktop review.

Read the included **AAAAT User Guide** or [docs/user-guide.md](docs/user-guide.md)
for the complete workflow.

## For developers and support

The repository contains development tests and an explicit support artifact;
they are not part of the normal desktop release or connected-AI integration.

- [Build the Windows release](docs/build-windows-release.md)
- [Maintenance and recovery](docs/maintenance.md)
- [v1 implementation authority](docs/requirements/v1-authoritative-requirements.md)
