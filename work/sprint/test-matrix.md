# Test Matrix

1. Database initializes: `tests/test_db.py`
2. Application can be created: `tests/test_db.py`
3. Raw intake can be added in full mode: `tests/test_db.py`
4. Dashboard payload contains applications and glossary: `tests/test_dashboard_modes.py`
5. Full dashboard contains Raw intake controls: `tests/test_dashboard_modes.py`
6. Read-only dashboard does not contain Raw intake/write controls: `tests/test_dashboard_modes.py`
7. Static demo export does not contain Raw intake/write controls: `tests/test_static_export.py`
8. Static demo export uses fake demo payload: `tests/test_static_export.py`
9. Profile variables render into LaTeX templates: `tests/test_templates.py`
10. Missing required template variables fail clearly: `tests/test_templates.py`
11. Generated artifacts are stored with provenance: `tests/test_db.py`
12. CLI basic commands work: `tests/test_cli_mcp.py`
13. MCP schemas validate: `tests/test_cli_mcp.py`
