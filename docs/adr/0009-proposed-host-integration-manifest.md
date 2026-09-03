# ADR 0009 — Proposed host integration manifest

## Context

M4 requires one demonstrated adaptive host integration, configuration portability, and structured setup knowledge. Host configuration contains machine-local executable and workspace paths, while portable AAAAT configuration must not become a plugin registry or silently activate external control.

## Decision

The first host integration supports VS Code only. AAAAT stores a versioned `integrations/vscode-mcp.json` manifest in the user-owned workspace. The manifest records only the demonstrated host, stdio transport, bounded application capability/tool names, permission scope, privacy disclosure, and one setup-recipe identifier. It contains no executable, workspace, project, credential, or other machine-local path.

The manifest is proposed material, not executable configuration. Activation validates the existing workspace, the AAAAT executable, the exact manifest, and a real official-SDK MCP connection by listing the expected tool surface before writing `.vscode/mcp.json` in the user-selected VS Code project. A compatible existing AAAAT server entry is accepted without replacement; a conflicting entry is refused. VS Code remains responsible for its own MCP trust and enablement decisions.

The setup recipe is one literal structured source of known AAAAT actions. It is not a generic installer engine, plugin model, host registry, or generated shell-program format.

## Consequences

- The portable workspace records integration intent without embedding machine paths.
- Moving the workspace or application requires regenerating the host file for that environment rather than editing the portable manifest.
- Host activation proves the currently packaged MCP surface before changing host configuration.
- Additional hosts remain separate demonstrated cases; this ADR does not authorize an adapter framework.

## Alternatives rejected

- Storing absolute host paths in the workspace manifest: not portable.
- Automatically enabling or trusting the MCP server in VS Code: bypasses the host security boundary.
- Replacing existing host configuration unconditionally: violates adaptive setup and user ownership.
- Generic host/plugin/provider registries or executable setup recipes: premature and explicitly outside M4.
