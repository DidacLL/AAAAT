# AAAAT

AAAAT is a private desktop workspace for job research, applications, interview
preparation, and the documents that support them. It works on its own and can
optionally keep a conversation with a capable AI host aligned with that local
workspace.

Normal users receive a packaged desktop release for their operating system.
They open AAAAT directly; they do not install Python, use a terminal, run tests,
or keep a source checkout.

## Start using AAAAT

1. Open the packaged AAAAT desktop application.
2. On first use, choose where AAAAT keeps the private workspace. The suggested
   location is outside the application and outside AI-host folders.
3. Use the desktop manually, or choose **Connect my AI** for guided setup.
4. The connected LLM assesses its own host and configures the strongest route it
   supports: native MCP or tools first, then an approved host-owned skill,
   script, or automation, with portable exchange only as the fallback.

The normal interface does not ask the user for a database location, command,
internal identifier, provider credential, port, or protocol. AAAAT exposes only
a paired task interface; the external LLM supplies provider-specific reasoning
and host configuration while AAAAT retains local validation and desktop review.

Read the included **AAAAT User Guide** or [docs/user-guide.md](docs/user-guide.md)
for the user workflow.

## For developers and maintainers

Repository instructions, tests, maintenance commands, and release tooling are
not part of the connected-LLM runtime interface.

- [Build a packaged release](docs/build-release.md)
- [Maintenance and recovery](docs/maintenance.md)
- [v1 implementation authority](docs/requirements/v1-authoritative-requirements.md)
