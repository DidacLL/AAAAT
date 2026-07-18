# Security Policy

## Reporting a vulnerability

Report security issues privately through GitHub's private vulnerability-reporting feature when available. Do not open a public issue containing exploit details, workspace data, credentials, or personal job-application information.

Include the affected version or commit, operating system, smallest fictional reproduction, expected and observed authority boundary, and whether private paths, records, or artifacts were exposed.

## Sensitive data

Never attach a real AAAAT workspace, SQLite database, CV, cover letter, recruiter message, offer, profile export, or generated private artifact to an issue or pull request. Reproduce problems with fictional data in a temporary workspace.

AAAAT does not require provider credentials. Host-specific credentials remain owned by the external host and must not be stored in the AAAAT repository or workspace.

## Security model

The private workspace is local and user-selected. A connected host receives the single packaged `AAAAT` skill, an opaque revocable connection capability, purpose-scoped work context, explicit schemas, and short-lived callback capabilities.

A connected host does not receive repository access, database access, workspace paths, arbitrary entity browsing, general CLI execution, desktop widget commands, or internal identifiers as broad mutation authority.

AAAAT validates bounded results locally and applies them to internally bound records. Privacy does not rely on mandatory human review of AI work.

## Supported versions

Security fixes are provided for the latest published release and the current `main` branch.
