# Provider-agnostic dispatch release slice

Status: parallel feature branch from PR #37 head `97b2e474d4c609002a4c786f81c60446e3b0be5e`.

## Product boundary

AAAAT owns private local data, bounded task construction, scoped context, result storage, review state, provenance, and deterministic apply.

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

The existing `aaaat.dispatch.packet`, `aaaat.dispatch.manual`, and `aaaat.dispatch.command` modules already implement the first provider-neutral foundations. This branch does not add a duplicate host protocol, provider SDK, credential store, or inference client.

## Test correction

Earlier tests on this branch asserted declarations and absences: API-key ownership booleans, provider non-capabilities, blacklist key scans, and a self-validating compatibility descriptor. Those tests were removed because they did not exercise AAAAT software.

The replacement tests execute supported workflows:

1. create a candidature and bounded task;
2. export the real manual packet to the local outbox;
3. simulate a result from any preferred external agent;
4. submit it through the existing task result boundary;
5. verify it remains suggested before review;
6. apply it through the stored task binding;
7. verify the candidature changes only after explicit apply.

A second workflow executes a user-owned command that consumes the packet over stdin and returns JSON over stdout. A failing command is also tested to ensure no result is created.

## Current release direction

The next product slice should expose these existing capabilities in the desktop UI:

- list queued tasks for the selected candidature;
- copy or export the manual packet;
- optionally run a user-configured command backend;
- show dispatch failure or received-result state;
- show suggested result and provenance;
- expose explicit apply/reject controls.

This remains independent of PR #38's projection and desktop-command hardening.
