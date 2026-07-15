# Local release validation

Use `aaaat-release-validate` to automate the non-visual v1 acceptance gates in an isolated local store and collect evidence.

A successful run reports:

```text
AUTOMATED_GATES_PASSED
MANUAL_GATES_PENDING
```

This does not declare the product released. Real wx behavior, real external-intelligence communication, browser/chat transfer, document quality, responsiveness, migration and recovery remain human acceptance gates.

## Deterministic self-test

This profile requires no external model, provider software, endpoint or credential:

```bash
aaaat-release-validate \
  --runtime deterministic \
  --storage .private-release-validation \
  --evidence-dir release-evidence
```

It validates:

- the provider-neutral bounded command boundary;
- fake-data connection conformance;
- profile completion;
- the complete candidature lifecycle;
- progress, failure and safe retry behavior;
- grouped browser/chat bundle export;
- privacy and authority filtering;
- local artifact rendering;
- desktop projection visibility.

The deterministic connector is CI evidence. It is not a recommended user runtime.

## Custom bounded connector

Use the custom profile to validate any explicitly selected command or connector:

```bash
aaaat-release-validate \
  --runtime custom \
  --command-json '["/path/to/connector", "--fixed-argument"]' \
  --storage .private-release-custom \
  --evidence-dir release-evidence-custom
```

The command must:

- read one bounded AAAAT task object from stdin;
- write one result JSON object to stdout;
- use stderr only for diagnostics or newline-delimited progress events;
- return a nonzero exit code on failure;
- avoid database paths, internal IDs and broad AAAAT authority.

The connector may communicate with the selected external intelligence using HTTP, an SDK, a callback, a listener, browser interaction, files or another appropriate mechanism. That provider-facing transport is outside the AAAAT command contract. It must not turn the connector into a broad AAAAT data or mutation service.

## Concrete adapters

Named runtime adapters are optional compatibility implementations configured through **Advanced integration**. They are not release profiles, architectural dependencies or mandatory acceptance targets.

A maintainer may use any concrete adapter when recording the real automatic-integration acceptance evidence. The evidence must identify:

- the selected adapter or connector;
- whether communication is local, public, browser-mediated or host-controlled;
- the bounded context that was disclosed;
- credential ownership;
- conformance result;
- profile and candidature lifecycle result;
- progress, failure and retry behavior;
- provenance recorded by AAAAT.

## Human acceptance after automated validation

Before repository work can be considered ready for human acceptance, the automated matrix must be green for the exact head commit. Human acceptance must then demonstrate:

1. complete manual wx use without an integration;
2. the user-intent-first connection flow;
3. one maintainer-selected real automatic integration;
4. one independent real host or transport;
5. one browser or chat AI bundle round trip;
6. visible progress, failure, retry and cancellation where supported;
7. editable generated results and local artifact rendering;
8. realistic storage upgrade, backup, reopen and shutdown.

## Evidence

A run writes `release-report.json`, `release-report.md`, environment and runtime evidence, bounded task evidence, portable bundle evidence and one JSON file per stage.

Exit status is zero only when every automated stage passes. Real-environment manual gates remain pending until separately recorded.
