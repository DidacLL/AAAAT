# ADR 0019 — Shared read-only setup environment snapshot

**Status:** Accepted for Issue #181

## Context

AAAAT already has separate working boundaries for workspace selection, local TeX rendering, named AI connections with validated operation capabilities, backup/recovery and one demonstrated external-host integration. Product authority requires one small explicit environment/capability model to support graphical setup and later generated `installer.ai` / `configurator.ai` guidance. Duplicating those facts into a new installer database or building a generic setup engine would create drift before there is a second useful setup action.

## Decision

Introduce one read-only setup-environment snapshot exposed through a bounded renderer → preload → main operation.

The first snapshot contains only facts already needed by current product capabilities:

- whether the remembered workspace location still looks available;
- whether the fixed known `latexmk` and `pdflatex` commands can be invoked, plus a bounded version line when available;
- document-rendering readiness derived from those TeX facts;
- configured local AI connection count;
- whether each of the six existing AI operations has a validated route, including the selected connection name.

TeX detection invokes only those two fixed executable names with fixed version arguments, no shell interpolation and a short timeout. It never installs, updates, replaces or configures software. AI capability facts are projections of the existing connection/routing service; there is no second AI configuration model.

The snapshot is useful directly in Settings and is deliberately reusable by later generated guidance. Later setup mutations, configuration import/export, host-specific artifact generation and `installer.ai` / `configurator.ai` output remain separate capabilities.

## Consequences

AAAAT gains a single honest environment-status vocabulary without creating a package manager, shell surface, provider registry or setup framework. Existing working local software is detected and reused. Missing capabilities are reported as missing rather than silently repaired.

The model may grow only when another concrete setup capability needs an additional fact. It must not become a generic machine inventory or arbitrary command-execution API.
