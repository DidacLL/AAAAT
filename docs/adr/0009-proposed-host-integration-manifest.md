# ADR 0009 — Host adapters sit over the shared bounded assistant contract

**Status:** Amended by current Product Owner authority during PR #319

## Context

The original version of this ADR used VS Code as the first demonstrated MCP host and described that concrete adapter in product-level terms. Natural-use acceptance later established that this was implementation drift: AAAAT is provider- and host-agnostic. VS Code was useful evidence that the bounded integration could work, but it is not a privileged product dependency.

The important architectural boundary is AAAAT's capability surface, not the host carrying it.

## Decision

AAAAT maintains one small local bounded external-assistant contract. Compatible hosts may connect to that contract using a supported carrier such as the packaged MCP stdio entry point. The contract exposes meaningful AAAAT capabilities, not generic machine authority.

Current bounded capabilities cover Source-backed candidature creation, locally selected opportunity-research context/Source retention, deliberately shared career/CV context, local CV rendering under explicit authorization, and privacy-minimal `installer.ai` / `configurator.ai` status.

The contract does **not** expose generic database queries, filesystem access, shell/process execution, arbitrary package installation, corpus browsing, local entity IDs as mutation handles, or unrelated private workspace areas.

VS Code remains one optional adapter. Its `integrations/vscode-mcp.json` manifest and `.vscode/mcp.json` activation path may continue to exist for users who want that host, but Settings must present it as an advanced adapter over the shared contract rather than the integration model itself.

This decision does not authorize a generic plugin framework or executable adapter registry. Additional hosts should reuse the bounded contract and add only the minimum concrete adapter needed for demonstrated value.

## Consequences

- Product language is host/provider agnostic.
- The shared MCP tool contract can be used by ChatGPT, Claude, local agents, editor hosts or other compatible environments without changing AAAAT domain authority.
- VS Code-specific setup remains maintainable but secondary.
- Security review focuses on the bounded AAAAT capability contract rather than assuming the host is trusted merely because it is a known editor.
- Host-specific broader permissions remain the user's separate trust choice outside AAAAT.
