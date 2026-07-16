# Build a packaged AAAAT release

This is a maintainer workflow, not a normal-user installation path.

AAAAT uses one release recipe on Windows, macOS, and Linux. Build on the target
operating system because wxPython and the frozen executables contain native
platform components.

From a trusted checkout:

```text
python -m pip install ".[desktop,release]"
python tools/build_release.py
```

The build creates a platform-labelled folder and ZIP under `dist/`. The package
contains:

- the wx desktop application;
- the paired host bridge;
- the user guide;
- the schema and runtime skill required by those executables.

It does not intentionally expose the repository, tests, development guidance,
maintenance commands, broad CLI, private workspace, or provider credentials.
The desktop and bridge remain separate executables; the bridge accepts an
opaque pairing capability and resolves the private workspace internally.

The same portable layout is used on every platform:

- the desktop executable or macOS app is at the package root;
- the paired bridge is under `bridge/`;
- AAAAT private data is chosen on first launch and remains outside the package;
- host integration material is exported separately from the desktop.

Native signing, notarization, or an operating-system installer may wrap this
portable output for a particular release channel. Such wrapping must not change
the application boundary or add provider-specific runtime behavior. Do not
publish a platform artifact until it has been built and exercised on that
platform.
