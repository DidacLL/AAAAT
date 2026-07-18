# Development

This document is for humans working on the AAAAT source. It is not included in installed releases and is not part of the LLM-facing product skill.

## Environment

AAAAT supports Python 3.11, 3.12, and 3.13.

```text
python -m venv .venv
python -m pip install -e .[desktop,release]
```

The core dependency list is empty. wxPython is optional for the desktop, and PyInstaller is needed only for native release builds.

## Source map

```text
aaaat/                 product logic, persistence, bridge, rendering
aaaat/ui_desktop/      wx adapter and views
docs/                  human product and technical documentation
examples/              fictional examples
scripts/               maintained launch or support scripts
tests/                 unittest behavioral tests
tools/                 build and release tools
```

The main product entry points are `aaaat-desktop` and `aaaat-host-bridge`.

## Design constraints

- Keep the wx desktop fully usable without AI.
- Keep candidature persistence independent from optional task creation.
- Keep external-host authority bounded by code and schemas.
- Prefer explicit Python and SQLite code over generic frameworks.
- Do not add provider SDKs, a plugin framework, a workflow engine, telemetry, or a broad agent CRUD API.
- Do not preserve compatibility layers for interfaces or schemas that were never released.
- Do not fabricate product data to satisfy storage assumptions.
- Keep repository-development instructions out of installed packages.

## Validation

Run executable checks from the repository root:

```text
python -B -m compileall -q aaaat tests tools scripts
python -B tools/validate_mcp.py
python -B -m unittest discover -s tests
```

For native package work:

```text
python tools/build_release.py
python tools/verify_release.py
```

Tests should protect durable behavior such as:

- database initialization and persistence;
- incomplete candidature creation and raw-intake retention;
- manual desktop behavior;
- Smart and Detailed View projections;
- profile and template rendering;
- artifacts and provenance;
- bounded bridge authority;
- backup and restore;
- installed entry points and native package startup.

Do not test exact documentation wording, a fixed documentation file list, branch names, PR numbers, source line counts, widget hierarchy, temporary labels, or repository aesthetics.

## Documentation

Documentation is written for humans: users, maintainers, contributors, and technically curious readers. Keep the product definition focused on AAAAT’s value, behavior, principles, and mechanisms. Put implementation details in architecture or development documentation rather than displacing the product definition.

LLM-facing installed instructions belong only in `aaaat/SKILL.md`. Repository-development constraints belong in `AGENTS.md`. Neither should be confused with general product documentation.

## Data safety

Use fictional information in tests, examples, screenshots, and issue reproductions. Ordinary `.gitignore` and package manifests keep private workspaces, databases, caches, and build outputs out of version control and releases.

## Change discipline

Prefer narrow corrections over broad redesign. Remove proven duplicate or dead code with its tests and references. Do not restructure the package merely to match a generic architecture vocabulary.

A pull request should explain the product effect and include the checks actually run. Do not merge integration work into `main` without explicit maintainer authorization.
