# Build and publish an AAAAT release

This is a maintainer workflow. Normal users download a verified package and open
AAAAT; they do not install Python, use Git, or run build commands.

AAAAT uses one release recipe on Windows, macOS, and Linux. The same source,
first-run flow, private-workspace boundary, and paired host bridge are used on
every platform. Native runners are required only because wxPython and frozen
executables contain operating-system components.

## Automated release gate

The `AAAAT Validation and Release` workflow runs:

- the complete behavioral suite on Python 3.11, 3.12, and 3.13;
- the shared package builder on Windows, macOS, and Linux;
- a packaged desktop startup check that constructs the first-run and main windows;
- a packaged bridge handshake and exact bounded-tool-catalogue check;
- private/development file boundary checks;
- SHA-256 verification for every release ZIP.

Pull requests and manual workflow runs retain the verified packages as workflow
artifacts. Pushing a version tag such as `v1.0.0` runs the same gates and attaches
all verified platform ZIPs and checksums to the corresponding GitHub release.
A failed platform or behavioral job prevents publication.

## Local maintainer build

From a trusted checkout on the target operating system:

```text
python -m pip install ".[desktop,release]"
python tools/build_release.py
python tools/verify_release.py
```

Linux maintainers may use the distribution wxPython package with a virtual
environment created using `--system-site-packages`, matching the automated
workflow.

The build creates a platform-labelled folder, ZIP, and SHA-256 sidecar under
`dist/`. The package contains:

- the wx desktop application;
- the paired host bridge;
- the user guide;
- the schema and runtime skill required by those executables.

It does not intentionally expose the repository, tests, development guidance,
maintenance commands, broad CLI, private workspace, or provider credentials.
The desktop and bridge remain separate executables; the bridge accepts an
opaque pairing capability and resolves the private workspace internally.

The portable layout is consistent across platforms:

- the desktop executable or macOS app is at the package root;
- the paired bridge is under `bridge/`;
- AAAAT private data is chosen on first launch and remains outside the package;
- host integration material is exported separately from the desktop.

Signing or notarization may be added by a release channel without changing this
application boundary or introducing provider-specific behavior.
