# Security Model

AAAAT binds the local server to `127.0.0.1` by default and stores private data in `.private/`.

Modes:
- Full local: read/write controls and raw intake.
- Read-only: same private data without write/raw intake controls.
- Static demo: fake data only, no backend, no write/raw intake controls.

Generated private artifacts remain local. Destructive actions are outside the MVP.
