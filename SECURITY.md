# Security Policy

## Reporting a vulnerability

Report security issues privately to the repository maintainer through GitHub's
private vulnerability-reporting feature when available. Do not open a public
issue containing exploit details, workspace data, credentials, or personal job
application information.

Include:

- affected version or commit;
- operating system;
- the smallest fictional reproduction;
- expected and observed authority boundaries;
- whether private paths, records, or artifacts were exposed.

## Sensitive data

Never attach a real AAAAT workspace, SQLite database, CV, cover letter, recruiter
message, offer, profile export, or generated private artifact to an issue or pull
request. Reproduce problems with fictional data in a temporary workspace.

AAAAT does not require provider credentials. Any host-specific credentials remain
owned by the external host and must not be stored in the AAAAT repository or
workspace.

## Security model

The private workspace is local and user-selected. The connected-host boundary is
limited to packaged runtime instructions, opaque capabilities, purpose-scoped
context, explicit schemas, and deterministic result application.

A connected host must not receive repository access, database access, workspace
paths, arbitrary entity browsing, desktop commands, or internal identifiers as
broad mutation authority.

## Supported versions

Security fixes are provided for the latest published release and the active
integration branch. Older unreleased branches and superseded draft pull requests
are recovery references, not supported products.
