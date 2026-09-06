# AAAAT v2

AAAAT is a private local workspace for capturing, maintaining, retrieving, and reusing career and opportunity information, and for creating portable application documents. It works without AI and can use the user's chosen AI through purpose-specific, privacy-projected operations.

The authoritative product definition and master architecture are docs/OWNER_INTENT.md and docs/SPEC.md. AGENTS.md is the development entry point. The current Mission identifies the next bounded capability; historical checkpoints, branches, and v1 are evidence, not product authority.

For alpha installation, manual workflows, optional AI, backup/restore, and troubleshooting, see docs/USER_GUIDE.md.

## Development

    npm ci
    npm run verify
    npm start

Packaging evidence is separate:

    npm run verify:package
