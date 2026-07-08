# MCP

AAAAT includes a dependency-free MCP-compatible descriptor for resources, tools, and prompts. It follows the current MCP server feature shape of resources, tools with `inputSchema`, and prompts with arguments.

Run:

```bash
python -m aaaat.cli mcp-descriptor
python -m aaaat.cli mcp-validate
```

The descriptor exposes capabilities only: task envelopes/context/result submission, raw-offer intake acknowledgements, and structured extraction proposal submission. It does not call an LLM and does not bypass AAAAT privacy scopes.
