# Advanced and maintenance command boundary

AAAAT's normal product is the wx desktop application. A normal user does not
need a command line, and a connected LLM does not discover AAAAT by reading or
running repository commands.

This document records the architectural boundary for developers and support. It
is not a runtime command catalogue.

## Normal installed surface

The normal packaged release exposes only:

- the AAAAT desktop application;
- the opaque paired host bridge used through exported integration material.

The paired bridge has no storage argument and advertises only its named bounded
tools. Tool discovery on that verified connection is the connected host's
operation catalogue.

## Advanced and maintenance surface

Source installations and separate support artifacts may contain commands for
backup, restore, upgrade, diagnostics, migration, fixtures, and direct local
administration. Those operations may use internal identifiers or filesystem
locations because they run under deliberate local maintainer authority.

They are not:

- normal user setup;
- the connected-host contract;
- runtime guidance to copy into an LLM;
- an alternative to the paired bridge;
- evidence that an LLM may inspect or mutate the private workspace.

Advanced commands must remain outside the host-integration folder and outside
normal user-facing documentation. Support procedures should identify the exact
operation needed instead of publishing the entire administrative surface.

## Shared domain services

The desktop, paired bridge, portable fallback, and deliberate Advanced command
may reuse the same bounded acquisition, progress, validation, result-ingestion,
and domain-application services. Reuse does not widen authority: each wrapper
must expose only the operations intended for its audience.

A generic local/admin CLI may remain useful for maintainers, but packaging it or
documenting it does not make it an agent interface. The installed connected host
must be structurally unable to reach arbitrary profile, candidature, keyword,
artifact, task, database, or filesystem operations through its paired tools.
