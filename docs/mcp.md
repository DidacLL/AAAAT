# MCP

AAAAT includes a dependency-free MCP-compatible descriptor for resources, tools, and prompts. It follows the current MCP server feature shape of resources, tools with `inputSchema`, and prompts with arguments.

Run:

```bash
python -m aaaat.cli mcp-descriptor
python -m aaaat.cli mcp-validate
```

The descriptor exposes capabilities only. It does not call an LLM and does not bypass AAAAT privacy scopes.
