# AAAAT paired MCP bridge

This is a development and support description of the installed paired bridge.
Normal users begin from **Connect my AI** in wx and do not configure MCP,
commands, paths, ports, or capabilities themselves.

The desktop exports host-only integration material containing the runtime skill,
an opaque pairing card, and the exact local bridge launch configuration. The
selected LLM uses that material to configure its own provider or host and then
verifies initialization, tool discovery, and ping.

## Tool catalogue

The paired bridge advertises only named product operations:

- `get_connection_status`;
- `open_workspace`;
- `start_profile`;
- `create_candidature`;
- `get_next_agent_work`;
- `report_agent_task_progress`;
- `submit_agent_task_result`.

There is no generic action packet, broad record API, resource browser, profile
editor, candidature editor, command catalogue, or storage argument on the
paired interface.

## Connection control plane

The opaque connection capability maps privately to one selected workspace. The
host-only launch configuration may identify the installed bridge executable,
but it contains no private workspace path or database path. Revocation is owned
by the desktop and is rechecked before every bridge operation.

Connection setup belongs to the LLM host. With user approval, that host may
create its MCP configuration, tool, durable skill, helper script, automation, or
schedule. AAAAT does not manage provider credentials or duplicate host
permissions.

## Complete work acquisition

`get_next_agent_work` atomically claims one eligible attempt and returns one
complete purpose-scoped work item. The item contains its instructions, bounded
context, exact response schema, privacy information, permitted callbacks, and a
random attempt capability.

The capability authorizes only progress and result callbacks for that attempt.
It is not an application, candidature, task-row, profile, keyword, artifact,
file, database, or storage identifier.

## Progress and result submission

Progress is limited to the active attempt and cannot mutate candidature data.
A result must match the work item's declared schema. AAAAT strips external
replacement controls, rejects forbidden authority fields, and applies accepted
content through its own domain services.

Existing non-empty profile values and canonical keyword definitions remain
user-owned. New content fills supported gaps or remains reviewable history.

## Boundary

The paired MCP bridge does not expose:

- SQLite or arbitrary local files;
- repository or private-workspace browsing;
- internal identifiers as mutation authority;
- broad candidature, profile, task, keyword, or artifact listing;
- dashboard or desktop commands;
- provider credentials or model configuration;
- generic CLI or maintenance operations;
- another queue or result-application path.

A same-user process that has independently been granted unrestricted shell or
filesystem access can bypass application-level boundaries. Normal safe use is
to grant the host the exported integration material and paired bridge, not the
repository, maintenance shell, or private workspace.
