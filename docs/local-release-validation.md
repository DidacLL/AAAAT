# Local release validation

Status: automated release validation.

The active validation sources are:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`
- `docs/release-checklist.md`

`aaaat-release-validate` executes the provider-neutral application lifecycle with deterministic fixtures: profile context, candidature extraction and preparation, paired-host work, portable exchange, retry semantics, privacy boundaries, rendering, and desktop projection visibility.

`tools/verify_release.py` verifies the archive checksum, extracts the exact release ZIP into a temporary directory outside the repository checkout, preserves packaged executable permissions, and runs the packaged desktop startup check and paired bridge from that extracted copy.

Any failing maintained gate blocks the candidate release.
