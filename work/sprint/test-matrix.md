# Test Matrix

Current v1 release checks should focus on the wx desktop runtime, local data, bounded agent-compatible CLI commands, rendering, and schema/domain behavior.

## Core coverage

1. Database initializes local private storage.
2. Raw offer intake creates an active candidature and raw intake record.
3. Desktop demo seed creates fake active/closed candidatures for UI validation.
4. Smart View opens and renders selected candidature context.
5. Detailed View lists candidatures and supports field-local editing/generation controls.
6. User View renders editable professional/profile data.
7. Profile variables render into local templates.
8. Missing required template variables fail clearly.
9. Generated artifacts are stored with provenance.
10. CLI basic commands work.
11. MCP descriptor validation passes.
12. Agent task/context/action commands remain bounded and do not expose broad CRUD authority.

## Verification commands

```powershell
python -B -m unittest discover -s tests
python -B -m aaaat.cli mcp-validate
aaaat-seed-desktop-demo --reset --count 64
aaaat-desktop
```

## Manual smoke

Use temporary storage and exercise:

```powershell
python -B -m aaaat.cli --storage <tmp>\private init
python -B -m aaaat.cli --storage <tmp>\private app create --company "Audit Demo Co" --role "Audit Engineer"
python -B -m aaaat.cli --storage <tmp>\private app list
python -B -m aaaat.cli --storage <tmp>\private app show <created_id>
python -B -m aaaat.cli --storage <tmp>\private intake add <created_id> --content "Audit intake"
python -B -m aaaat.cli --storage <tmp>\private artifact list <created_id>
python -B -m aaaat.cli --storage <tmp>\private profile set display_name "Audit Candidate"
python -B -m aaaat.cli --storage <tmp>\private render cv --output <tmp>\cv.tex
python -B -m aaaat.cli --storage <tmp>\private render cover-letter <created_id> --body "Audit body" --output <tmp>\cover-letter.tex
python -B -m aaaat.cli mcp-validate
```
