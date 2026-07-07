# Security Model

AAAAT binds the local server to `127.0.0.1` by default and stores private data in `.private/`.

Modes:
- Full local: normal local working dashboard with viewing, annotations, queue inspection, contextual edits, and raw-offer intake.
- Read-only: same private data without write/raw intake controls; write requests return `403`.
- Static demo: fake data only, no backend, no write/raw intake controls.

Generated private artifacts remain local. Destructive actions are outside the MVP.

Private reusable values are stored as variables with stable placeholders. Profile inputs such as `display_name` are canonicalized to `profile.display_name` and represented as `{{ profile.display_name }}` for agent work. Local rendering can resolve real values; agent contexts resolve according to each variable exposure policy (`raw`, `redacted`, `summarized`, `placeholder`, or `denied`); static demos never resolve real values.
