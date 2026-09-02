# Security Policy

## Reporting a vulnerability

Report vulnerabilities privately through GitHub's private vulnerability-reporting feature when available. Do not open a public Issue containing exploit details, credentials, workspace data, or personal job-application material.

Include the affected commit/package, operating system, smallest fictional reproduction, expected and observed authority boundary, and whether private paths, records, credentials, or artifacts were exposed.

## Sensitive data

Never attach a real AAAAT workspace, SQLite database, CV, cover letter, recruiter message, offer, profile export, credential, prompt containing private data, or generated private artifact to source control or GitHub coordination surfaces.

Reproduce issues with fictional data in a temporary workspace.

## Security model

- The local workspace is authoritative.
- The Electron renderer is sandboxed, context-isolated, and has no Node integration.
- The preload exposes only fixed typed domain capabilities.
- Privileged IPC validates senders, inputs, and outputs.
- The renderer receives no generic filesystem, database, shell, process, credential, networking, or Electron authority.
- AI context is constructed per operation and privacy-projected before inference.
- Invalid or conflicting AI output does not silently mutate authoritative data.
- External integrations receive bounded application capabilities, not internal mutation handles.
- Credentials use secure OS-backed storage where available and are never committed.

## Supported versions

Security fixes target the current `main` branch and the latest published v2 release once one exists. V1 is preserved as prototype history and is not an active compatibility target.
