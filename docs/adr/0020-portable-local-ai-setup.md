# ADR 0020 — Portable AI setup excludes environment validation

**Status:** Accepted for Issue #185. Endpoint acceptance follows the current ADR 0006 boundary: loopback HTTP or already-authenticated remote HTTPS.

## Context

AAAAT requires configuration portability through ordinary user controls. Workspace backup deliberately excludes `ai-connection.json` because it is machine-local configuration, while the current internal file also contains durable local connection IDs, validated-operation claims and per-operation defaults. Copying that internal file as the portable contract would leak local correlation identifiers and could make a capability validated on one machine appear valid on another.

## Decision

Define one small versioned portable AI-setup contract, separate from the internal `ai-connection.json` representation.

Format `aaaat-ai-setup`, version 1 contains only:

- up to 16 named connection definitions: user-defined `name`, accepted `endpoint`, and `model`;
- the general default connection expressed by its unique connection name, or `null`.

The portable contract does not contain connection IDs, validated operations, per-operation defaults, workspace paths, credential material, career/application data, host artifacts, or machine inventory. Credential/authentication portability is outside this slice rather than prohibited product-wide.

Import validates the complete portable file before replacing current AI setup. It reuses the existing plain-base-URL rules and current ADR 0006 endpoint acceptance, requires connection names to remain unique case-insensitively, and requires any named general default to identify an imported connection. Imported connections receive fresh local UUIDs. Their validated-operation sets and all operation defaults start empty, so operation routing must be validated again in the destination environment.

The renderer exposes only two no-argument intentions: export portable AI setup and import portable AI setup. Electron main owns the save/open dialogs and bounded file handling. Import accepts only a regular JSON file no larger than 64 KiB. Settings warns that import replaces the current connection setup and clears environment-specific validation/default state before invoking the import operation.

## Consequences

Users can move their AI connection definitions and general preference without hand-editing JSON or coupling portability to whole-workspace backup. A moved setup is intentionally not immediately AI-ready merely because the source machine had validated capabilities; the user revalidates the operations they intend to use.

This decision does not establish a generic configuration framework, arbitrary file API, provider registry, credential portability mechanism, host-artifact format, or portability contract for unrelated AAAAT preferences. Those require separate demonstrated product need.
