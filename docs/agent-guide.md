# Connected-host architecture reference

This repository document is for AAAAT development and support review. It is not
the runtime guide for an LLM helping a person with job research.

The installed desktop application exports the complete host-integration material
to a separate user-selected folder. That exported runtime skill, opaque pairing
card, and paired bridge tool catalogue are the only normal local interface for a
connected LLM. A host must not inspect this repository, development documents,
tests, maintenance commands, application files, or the private workspace to
discover how to use AAAAT.

## Intended host role

A connected LLM is the user's conversational AAAAT interface and the intelligent
setup layer for its own provider and host. With the user's approval, it assesses
its capabilities and configures the strongest available route:

1. native local MCP or equivalent tools;
2. a host-owned skill or tool;
3. an approved host-side script, automation, or schedule;
4. portable task/result exchange as the final fallback.

AAAAT does not choose the provider or keep provider credentials. It supplies the
narrow paired protocol and enforces all local data authority.

## Connection boundary

Connection setup and bounded work are separate:

- setup uses the exported host-only material to configure and verify the paired
  bridge inside the LLM host;
- normal user conversation describes only benefits, consent, and connection
  state;
- the bridge resolves the selected private workspace internally;
- the host receives no workspace path, database path, repository path, or broad
  command catalogue.

The paired bridge's discovered tools are the complete authority granted to the
host. Current named operations cover connection status, opening the desktop,
beginning profile completion, creating a candidature from user-provided source
material, claiming one complete work item, reporting progress, and submitting a
validated result.

## Complete work items

Each acquisition returns one complete purpose-scoped work item containing:

- the work purpose and bounded instructions;
- only the context required for that purpose;
- the exact response schema;
- privacy and disclosure information;
- permitted callbacks;
- one random attempt capability.

The capability is privately bound to local records. It is not an application,
candidature, task-row, profile, keyword, artifact, file, or storage identifier.
It authorizes only the callbacks declared for that active attempt.

## Local authority

AAAAT owns persistence, eligibility, current-value decisions, validation,
deterministic application, rendering, artifacts, provenance, and desktop state.
The external LLM owns reasoning, research, writing, provider selection, network
policy, and host-specific configuration.

Agent results cannot replace existing non-empty user profile values or existing
canonical keyword definitions. New information fills supported gaps or remains
reviewable history according to the task's domain rules.

Broad listing, arbitrary search, generic action packets, identifier-based
mutation, direct database access, private-folder access, and desktop/admin
commands are not part of the paired host interface.

## Advanced and maintenance surfaces

Technical command configuration, diagnostics, backup, migration, and local
administration may exist for deliberate Advanced or maintainer use. They are not
runtime discovery material and must not be copied into a normal host integration
folder or presented to an ordinary user as the way to use AAAAT.
