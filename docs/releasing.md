# Releasing

AAAAT publishes native archives for Windows, macOS, and Linux from one source tree.

## Before tagging

1. update the version in `pyproject.toml`;
2. update `CHANGELOG.md` with user-visible changes;
3. run the complete behavioral suite;
4. build and verify the native package on each supported platform;
5. confirm the human documentation describes the actual product.

Use tags in the form `vX.Y.Z`.

## CI gates

Pull-request CI should verify executable product behavior:

- build and install the wheel;
- run installed entry-point help checks;
- compile Python sources;
- validate the bounded MCP descriptor;
- run the complete `unittest` suite on Python 3.11, 3.12, and 3.13;
- build and verify native packages on Windows, macOS, and Linux.

Private data and generated outputs are excluded through `.gitignore`, package manifests, fictional fixtures, and release verification.

## Local package build

```text
python -m pip install -e .[desktop,release]
python tools/build_release.py
python tools/verify_release.py
```

The build creates a runnable platform folder, a ZIP archive, and a SHA-256 checksum under `dist/`. Verification runs against the built package rather than relying only on the source checkout.

## Package contents

The runnable package contains:

- the native wx desktop application;
- the bounded host bridge;
- the SQLite schema;
- `aaaat/SKILL.md`, named `AAAAT`;
- concise user launch material.

It excludes:

- `AGENTS.md`;
- development and release documentation unless deliberately shipped as user help;
- tests, fixtures, repository tools, and scripts;
- branch, sprint, or planning records;
- private workspaces, databases, and generated artifacts.

## Release assets

```text
AAAAT-windows-x64.zip
AAAAT-windows-x64.zip.sha256
AAAAT-macos-arm64.zip
AAAAT-macos-arm64.zip.sha256
AAAAT-linux-x64.zip
AAAAT-linux-x64.zip.sha256
```

Each ZIP contains the runnable platform folder directly.

## Verification focus

Package verification covers:

- extraction and direct launch;
- first workspace initialization;
- separation between application files and private workspace data;
- desktop startup;
- bridge startup and bounded tool discovery;
- packaged `AAAAT` skill availability;
- backup-safe workspace behavior.

## Publishing and rollback

After the authorized integration change is merged, create the version tag and allow the release workflow to publish verified assets. Do not replace an existing public tag with different source.

When a release is invalid, publish a corrected patch release after repeating the behavioral and native-package checks. Application rollback must not overwrite the separate private workspace.
