# Build the Windows desktop release

This is a maintainer operation. It produces the normal user artifacts: a
self-contained portable folder/ZIP and, when Inno Setup is available, a Windows
installer. Both embed Python and wxPython. They expose the desktop application
and the paired host bridge only.

From a trusted checkout on Windows:

```powershell
.\tools\build_windows_release.ps1
```

For a portable-only build, use:

```powershell
.\tools\build_windows_release.ps1 -SkipInstaller
```

The build creates its temporary virtual environment outside the repository.
It excludes test clients, demo seeders, smoke fixtures, release validators, and
the raw maintenance CLI from the normal executable bundles. Build the separate
support artifact only when maintenance work is actually required:

```powershell
.\tools\build_maintenance_artifact.ps1
```
