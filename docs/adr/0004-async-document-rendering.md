# ADR 0004 — Asynchronous document rendering and safe project replacement

## Context

AAAAT renders user-owned portable LaTeX projects from the Electron main process. The original implementation ran `latexmk` synchronously, rewrote managed project files in place, and deleted the database record before removing its project directory. Those choices can block the main event loop or leave user-owned files in a mixed/lost state after partial failure.

## Decision

Document rendering keeps the existing main-process-to-`latexmk` boundary, but execution is asynchronous through one small document-specific runner. The document service permits one active render per project path; the runner applies a bounded timeout and terminates the spawned process tree on timeout.

On POSIX systems the runner starts `latexmk` directly. On Windows it invokes the system command interpreter only to resolve the `latexmk` command shim; the command name and all TeX flags are fixed, and the only variable flag derives from the validated `DocumentEngine` enum. No document content, user path, or other free-form user input is interpolated into the command.

Managed source replacement is staged on the same filesystem and installs the three managed source files with rollback to their previous versions if replacement fails. Document deletion first renames an existing project to a same-filesystem staged path, performs the database mutation, restores the project if that mutation fails, and removes the staged project only after database success.

No durable job state, worker system, generic transaction framework, scheduler, or recovery database is introduced.

## Consequences

- TeX execution no longer blocks Electron's main event loop.
- Duplicate renders are rejected explicitly instead of running concurrently against one project.
- Source-touching document operations are rejected while that project is rendering.
- Ordinary managed-generation failures preserve the previous complete managed source set.
- A failed database deletion preserves the user's project directory.
- Cleanup failure after a successful deletion may leave a clearly staged directory for manual recovery rather than silently destroying source.
- Renderer/preload authority and portable LaTeX ownership remain unchanged.

## Alternatives rejected

- Background job/worker framework: unnecessary for one bounded render operation.
- Durable render queue or recovery ledger: adds persistence and reconciliation complexity without a demonstrated requirement.
- Shelling arbitrary command text: unnecessary and would widen the process boundary; Windows uses only fixed validated arguments to resolve the command shim.
- Continuing `spawnSync` or in-place multi-file writes: retains the verified responsiveness and partial-failure defects.
