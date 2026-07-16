# AAAAT maintenance and recovery

This document is for a trusted maintainer, not ordinary desktop or connected-AI
use. The normal installer and portable bundle intentionally expose only the
desktop application and paired host bridge.

Build the explicit support artifact with:

```powershell
.\tools\build_maintenance_artifact.ps1
```

It contains the raw local-maintenance Python modules for backup, restore,
upgrade, diagnostics, and direct repair. Install it only in a trusted support
environment and invoke the maintenance CLI explicitly through:

```powershell
python -m aaaat.cli --help
```

Never register that command as an AI tool and never give its workspace options
to a connected host. A same-user process with unrestricted shell access can
bypass application-level boundaries; the supported connected-AI configuration
grants only the paired bridge.
