# ADR 0026 — ID-only retained artifact opening

- Status: Accepted
- Date: 2026-09-11
- Decision class: C
- Issue: #275

## Context

Retained application artifacts preserve the exact material used for a candidature. Product UX requires those artifacts to remain inspectable from the candidature, but the renderer must not receive arbitrary filesystem-opening authority.

AAAAT already uses an ID-only trusted operation for opening the current rendered document output: the renderer supplies a document ID and the main process resolves the authoritative output path before opening it.

## Decision

Extend the existing artifact desktop API with one bounded operation:

```text
artifacts.open(artifactId)
```

The renderer supplies only a validated artifact UUID. The trusted main process:

1. resolves the current workspace;
2. loads the retained artifact row by ID;
3. derives the retained PDF path from AAAAT's authoritative artifact layout;
4. verifies that the retained PDF exists as a file;
5. opens that exact path through Electron's platform shell operation.

Unknown artifact IDs, missing retained PDFs, invalid input, untrusted IPC senders and platform-open failures are rejected. The operation never falls back to the mutable working-document output and performs no durable mutation or activity write.

## Consequences

Retained exact application material becomes inspectable without introducing arbitrary path input, a generic filesystem/open service, new persistence, or a second artifact model. Working-document output opening and retained-artifact opening remain separate domain operations even though both use the same trusted-main security shape.

Any future need to reveal directories, open arbitrary files, export artifacts, edit/delete artifacts, or expose generic filesystem authority requires separate justification rather than expansion of this operation.
