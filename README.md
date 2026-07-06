# AutoApplicationAgentAgnosticTracker

AAAAT is a local-first job application tracker and artifact generator. It stores private data locally, renders a compact dashboard, and exposes passive CLI, REST, and MCP-compatible descriptor surfaces for whichever agent the user already prefers.

## Quick Start

```bash
python -m aaaat.cli init
python -m aaaat.cli app create --company "Example Co" --role "Backend Engineer"
python -m aaaat.cli launch
```

Full local mode supports browser forms for creating/updating applications, raw intake, glossary terms, profile variables, and artifact records. Read-only mode shows the same local data without write controls:

```bash
python -m aaaat.cli launch --read-only
```

Private data defaults to `.private/`. Static demos use `examples/demo_payload.json` only.
