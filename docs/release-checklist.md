# AAAAT v1 release checklist

Status: automated release gates.

Implementation authority:

- `docs/requirements/v1-authoritative-requirements.md`
- `docs/planning/v1-release-requirement-gap-ledger.md`

This checklist is intentionally short. Release validation is executable and must not become work assigned to an end user.

## Required automated gates

All items must pass from the exact candidate head:

- wheel build and installed entry-point checks;
- complete behavioral suite on Python 3.11, 3.12, and 3.13;
- upgrade idempotency, backup/restore, and data-preservation tests;
- clean-workspace onboarding and independent private-workspace behavior;
- distinct Smart View and Detailed View contracts;
- manual desktop operations represented by behavioral tests;
- standard assisted onboarding without internal jargon;
- complete bounded work acquisition through paired, portable, and Advanced wrappers;
- progress, result, retry, cancellation, and downstream-release equivalence;
- task-specific schemas, capability lifecycle, privacy boundaries, and path confinement;
- complete deterministic profile and candidature lifecycle;
- selected-candidature CV and cover-letter rendering;
- expected errors remain concise and traceback-free;
- native package build and verification on Windows, macOS, and Linux;
- checksum verification and execution from the exact archive after extraction outside the repository checkout.

A green subset is not sufficient. Every maintained gate must pass.

## Distribution shape

- GitHub Release assets are the platform ZIP and checksum directly. A normal user extracts once.
- Pull-request Actions artifacts contain the runnable platform folder directly inside GitHub's unavoidable artifact ZIP wrapper. A reviewer extracts once; there is no ZIP inside the downloaded ZIP.
- End users do not install Python, use Git, run tests, create reports, take screenshots, or follow QA scripts.

## Final decision

`RELEASE_READY` requires:

1. every automated gate above is green for the exact candidate head;
2. the automated lifecycle validator reports `RELEASE_READY`;
3. no unresolved release blocker remains in the authoritative gap ledger;
4. the release workflow publishes only the packages produced and verified by that head.

No human-in-the-loop validation gate, demonstration document, screenshot collection, or maintainer QA procedure is required.
