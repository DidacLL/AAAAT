# ADR 0020 — Portable AI connection settings

**Status:** Accepted. Endpoint acceptance follows ADR 0006: loopback HTTP or remote HTTPS. Portable setup excludes credentials, which must be configured separately when required.

## Context

AAAAT requires configuration portability through ordinary user controls. Workspace backup deliberately excludes `ai-connection.json` because it is machine-local configuration, while the current internal file also contains durable local connection IDs and optional protected credentials. The portable file contains the user-facing connection settings rather than machine-bound credential ciphertext.

## Decision

Define one small versioned portable AI-setup contract, separate from the internal `ai-connection.json` representation.

Format `aaaat-ai-setup`, version 1 contains only:

- up to 16 named connection definitions: user-defined `name`, accepted `endpoint`, and `model`;
- the general default connection expressed by its unique connection name, or `null`.

The portable contract does not contain connection IDs, workspace paths, credential material, career/application data, host artifacts, or machine inventory. Credential/authentication portability is outside this slice rather than prohibited product-wide.

Import validates the complete portable file before replacing current AI setup. It reuses the existing plain-base-URL rules and ADR 0006 endpoint acceptance, requires connection names to remain unique case-insensitively, and requires any named general default to identify an imported connection. Imported connections receive fresh local UUIDs. Assistance uses the imported general default.

The renderer exposes only two no-argument intentions: export portable AI setup and import portable AI setup. Electron main owns the save/open dialogs and bounded file handling. Import accepts only a regular JSON file no larger than 64 KiB. Settings warns that import replaces the current connection setup before invoking the import operation.

## Consequences

Users can move their AI connection definitions and general preference without hand-editing JSON or coupling portability to whole-workspace backup. Prior diagnostic claims do not travel with configuration and cannot establish destination reachability or usefulness. Diagnostic checks remain optional for normal use.

This decision does not establish a generic configuration framework, arbitrary file API, provider registry, credential portability mechanism, host-artifact format, or portability contract for unrelated AAAAT preferences. Those require separate demonstrated product need.
