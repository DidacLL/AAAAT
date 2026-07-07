# Security Model

AAAAT binds the local server to `127.0.0.1` by default and stores private data in `.private/`.

Modes:
- Full local: normal local working dashboard with viewing, annotations, queue inspection, contextual edits, and raw-offer intake.
- Read-only: same private data without write/raw intake controls; write requests return `403`.
- Static demo: fake data only, no backend, no write/raw intake controls.

Generated private artifacts remain local. Destructive actions are outside the MVP.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each variable exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.
# Profile Facts

AAAAT separates two profile data layers:

- `variables`: scalar placeholders and private template values, such as `profile.email`.
- `profile_facts`: structured professional/CV facts, such as skills, projects, education, salary expectations, preferences, and reusable summaries.

Profile facts carry editable `visibility`, `exposure`, and usage flags. Local dashboard contexts may show raw facts, but agent and market contexts must respect exposure. Market research should prefer anonymized or summarized profile facts and must not rely on raw sensitive facts by default.

Static demos must omit real profile facts or use fake profile facts only.
