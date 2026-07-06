from __future__ import annotations


AGENT_GUIDE = """# AAAAT Agent Guide

AAAAT stores private job application data locally and exposes scoped context to external agents.

Use CLI or local HTTP to inspect application context, add raw intake, save suggestions, save drafts, and render artifacts. Do not copy private data into public demo files, templates, or docs.

Core commands:
- `aaaat app list`
- `aaaat app show <id>`
- `aaaat intake add <id> --content "..."`
- `aaaat render cover-letter <id>`
- `aaaat render cv`
- `aaaat export static-demo outputs/demo.html`

Agents reason and draft. AAAAT validates, stores, renders, and separates public demo data from private data.
"""


def agent_guide() -> str:
    return AGENT_GUIDE
