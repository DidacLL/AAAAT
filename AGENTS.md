# AAAAT repository development

This file applies only to work on the source repository. It is excluded from installed releases. The installed LLM-facing product instruction is `aaaat/SKILL.md`, whose skill name is `AAAAT`.

## Product invariants

- AAAAT is a local job-application workspace, not an LLM wrapper or agent framework.
- The wx desktop is fully usable without an external LLM.
- Incomplete candidatures and raw source material save immediately.
- Optional AI work never gates local persistence or manual operation.
- Valid bounded AI results apply directly; do not introduce mandatory review or approval queues.
- Privacy is enforced through local scoping, schemas, capabilities, and inaccessible command surfaces.
- AAAAT remains provider-neutral and dependency-light.

## Change constraints

- Preserve Smart View and Detailed View behavior unless a product requirement explicitly changes it.
- Keep `aaaat/ui_desktop/` as the wx adapter.
- Prefer explicit application services and concrete SQLite operations.
- Do not add provider SDKs, connector catalogues, certification systems, workflow engines, telemetry, generic plugin systems, or broad agent CRUD APIs.
- Do not retain duplicate modules, migration paths, or compatibility aliases for unreleased contracts.
- Do not fabricate company, role, identity, or other facts as placeholders.
- Keep task and capability logic limited to the bounded work it actually supports.
- Do not place personal data in tests, examples, screenshots, documentation, or issues.

## Authority boundary

A connected host receives only the `AAAAT` skill, prepared connection material, the bounded bridge catalogue, purpose-scoped context, and callback capabilities for permitted operations.

It does not receive repository access, private-workspace paths, database authority, general CLI commands, arbitrary record enumeration, desktop widget commands, or internal identifiers as broad mutation handles.

## Validation

```text
python -B -m compileall -q aaaat tests tools scripts
python -B tools/validate_mcp.py
python -B -m unittest discover -s tests
```

For native package changes:

```text
python tools/build_release.py
python tools/verify_release.py
```

Test executable product behavior. Do not add tests for exact documentation wording, fixed file lists, branch names, PR numbers, source layout preferences, or temporary implementation labels.

## Documentation

Human documentation explains AAAAT’s product definition, behavior, mechanisms, architecture, use, development, and release process. Do not make development-agent instructions the main subject of product documentation.

Do not commit temporary prompts, sprint reports, handoffs, acceptance ledgers, or generated review transcripts. Ordinary `.gitignore`, package manifests, and focused review handle repository cleanliness.
