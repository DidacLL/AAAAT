# Provider-agnostic dispatch release slice

Status: parallel feature branch from PR #37 head `97b2e474d4c609002a4c786f81c60446e3b0be5e`.

## Product boundary

AAAAT owns private local data, bounded task construction, scoped context, result storage, review state, provenance, deterministic apply, and local artifact rendering.

The user-selected external runner owns reasoning, generation, provider/model choice, credentials, network policy, and provider-specific transport.

The invariant is the existing AAAAT task packet, not a new provider abstraction.

## Existing architecture

```text
AAAAT task
→ build_task_packet()
→ interchangeable dispatch backend
   → manual/outbox
   → user-configured command
   → future user script, local HTTP, or MCP sampling adapter
→ submit_agent_task_result()
→ suggested result
→ explicit apply_task_result()
```

The existing `aaaat.dispatch.packet`, `aaaat.dispatch.manual`, and `aaaat.dispatch.command` modules provide the provider-neutral foundation. This branch does not add a duplicate host protocol, provider SDK, credential store, compatibility declaration, or inference client.

## Implemented desktop release workflow

For the selected candidature, the desktop now supports:

1. creating company-research, field-completion, or cover-letter tasks;
2. exporting the bounded packet to the local outbox and clipboard;
3. importing one structured JSON result;
4. validating required result fields before storage;
5. displaying the result and review state;
6. editing and revalidating the result before apply;
7. explicitly applying or rejecting the result;
8. rendering a cover-letter TeX artifact locally;
9. opening the rendered artifact through the operating system;
10. refreshing Smart/Detailed projections after changes.

Cover-letter tasks cannot be applied until an artifact has been rendered. Editing a cover-letter result after rendering detaches the stale artifact and requires a fresh render.

## Behavioral evidence

Tests execute the actual workflows rather than declarations:

- company research remains suggested and leaves the candidature unchanged until explicit apply;
- edited results remain suggested and the edited value is what gets applied;
- invalid imports and invalid edits do not replace the stored valid result;
- cover letters require a rendered artifact before apply;
- rendered artifact paths resolve to real local files;
- editing after render invalidates the stale task-to-artifact binding;
- rejected results are archived and never mutate the candidature;
- manual and command dispatch backends preserve their durable success/failure behavior.

## Remaining before release acceptance

- manual wx acceptance of layout, clipboard, file dialogs, refresh, and OS artifact opening;
- decide whether the user-configured command backend belongs in the initial desktop dialog or remains an advanced CLI workflow;
- clean-install wheel validation and release packaging;
- release documentation and demonstration data/video.

This work remains independent of PR #38's projection and desktop-command hardening.
