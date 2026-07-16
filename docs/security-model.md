# Security model

AAAAT is a single-user local desktop application. The wx desktop is the
canonical human workspace and owns ordinary reading, editing, review, rendering,
and connection consent.

## Separated locations

The normal product uses three distinct locations:

- the installed application package;
- the user-selected private workspace;
- a user-selected host-integration folder containing only runtime guidance and
  opaque connection material.

The private workspace is not placed inside the application, repository, or AI
host folder. The paired host receives no workspace or database path.

## Paired-host authority

The normal connected LLM receives only the exported host material and the tools
advertised by the paired bridge. Those named operations may establish connection
state, open the desktop, begin profile completion, create a new candidature from
user-provided material, claim one complete work item, report progress, and
submit one result.

The bridge has no broad CRUD, record listing, arbitrary search, filesystem,
database, desktop-command, maintenance, or identifier-based mutation surface.
A generic local/admin CLI is not the agent contract and is not included in the
normal host integration.

## Work capabilities

Acquisition atomically claims one eligible attempt and returns its complete
purpose-scoped work item. The random attempt capability authorizes only the
callbacks declared for that attempt. AAAAT privately binds it to internal
records.

A capability is not an application, candidature, task-row, profile, career
plan, keyword, artifact, note, file, database, or storage identifier. Stale,
completed, cancelled, revoked, or superseded capabilities are rejected.

## Result application

All normal wrappers use the same validation and domain-application services.
External result fields cannot choose local record identifiers, storage paths,
artifact paths, or replacement policy. Agent-supplied replacement controls are
removed before application.

Existing non-empty desktop profile values and established canonical keyword
definitions remain authoritative. New content fills eligible gaps or is retained
as reviewable history according to the bounded task.

## Host adaptability

The external LLM owns provider/model selection, credentials, reasoning, network
policy, research tools, and host-specific setup. With user approval, it may
create its own MCP configuration, tool, skill, script, automation, or schedule.
AAAAT supplies the narrow protocol and enforces local data authority; it does
not attempt to predict every host or duplicate host permission systems.

## Data exposure

Work construction includes only purpose-required context. Profile variables and
facts follow configured exposure rules: raw, summarized, redacted, placeholder,
or denied. Generated artifacts remain local and under desktop review.

No real user data belongs in source control, fixtures, host runtime guidance, or
release artifacts.

## Operating-system limit

AAAAT's capability model is an application and information boundary, not an
operating-system sandbox. A same-user process independently granted unrestricted
shell, filesystem, database, or code-modification access can bypass it. Normal
safe use grants the LLM host the exported integration folder and paired bridge,
not the repository, maintenance shell, application internals, or private
workspace.
