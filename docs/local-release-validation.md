# Local release validation

Use `aaaat-release-validate` to automate the non-visual v1 acceptance gates in an isolated local store and collect evidence.

The command never declares the release ready by itself. A successful run reports:

```text
AUTOMATED_GATES_PASSED
MANUAL_GATES_PENDING
```

Visual wx inspection, real browser installation, rendered-document review and desktop responsiveness remain human gates.

## Deterministic self-test

This profile requires no external model or provider software:

```bash
aaaat-release-validate \
  --runtime deterministic \
  --storage .private-release-validation \
  --evidence-dir release-evidence
```

It validates the configured-command boundary, fake-data conformance, profile completion, full candidature lifecycle, safe retry, stale-result rejection, portable bundle export, privacy filtering, local artifact rendering and desktop projection visibility.

## Provider-neutral runtime contract

AAAAT does not require or privilege a model provider. A real runtime is accepted when it can satisfy one of these bounded subprocess contracts:

- `llama-cpp`: AAAAT invokes `llama-cli` with a user-selected local GGUF file.
- `custom`: AAAAT invokes any fixed argv command without a shell, writes one bounded task JSON object to stdin and reads one result JSON object from stdout.

The external runtime owns model installation, runtime configuration, networking policy, credentials, acceleration and lifecycle. AAAAT owns task scoping, validation, application, persistence and provenance.

A runtime passes conformance only after:

1. its configured executable and required local resources pass health validation;
2. its adapter settings validate;
3. it returns one valid JSON object;
4. it echoes the exact random nonce;
5. it reports `status: ready`.

## llama.cpp reference profile

llama.cpp is the documented reference because it can run an explicitly selected GGUF file directly and can be used without AAAAT opening a port. It is an example of the contract, not an architectural dependency.

```bash
aaaat-release-validate \
  --runtime llama-cpp \
  --model-path /path/to/model.gguf \
  --executable /path/to/llama-cli \
  --evidence-dir release-evidence-llama
```

Additional `llama-cli` arguments may be supplied with repeated `--arg` options. Typical examples include context size, GPU-layer allocation and grammar/schema controls supported by the installed llama.cpp version.

Windows PowerShell example:

```powershell
aaaat-release-validate `
  --runtime llama-cpp `
  --model-path "V:\Models\model.gguf" `
  --executable "V:\Tools\llama.cpp\llama-cli.exe" `
  --storage .private-release-llama `
  --evidence-dir release-evidence-llama
```

Before running AAAAT, verify the runtime independently:

```powershell
& "V:\Tools\llama.cpp\llama-cli.exe" --version
Test-Path "V:\Models\model.gguf"
```

## Any other local inference runtime

Use the custom profile for another local runtime or a small user-owned connector:

```bash
aaaat-release-validate \
  --runtime custom \
  --command-json '["/path/to/local-runtime-connector", "--fixed-argument"]' \
  --evidence-dir release-evidence-custom
```

The command must:

- read one bounded AAAAT task object from stdin;
- write one result JSON object to stdout;
- use stderr only for diagnostics or newline-delimited progress events;
- return a nonzero exit code on runtime failure;
- avoid requiring database paths, internal IDs or broad AAAAT access.

This profile can represent llama.cpp wrappers, LM Studio CLI-style tools, local model executables, Copilot CLI connectors, or future runtimes without changing AAAAT core.

## Optional compatibility adapters

Additional adapters may remain available for users who explicitly select them. They are compatibility paths only. Their presence does not make them the recommended runtime, a privacy guarantee or a release portability requirement.

## Evidence

A run writes:

```text
release-report.json
release-report.md
environment.json
runtime-configuration.json
runtime-conformance.json
bounded-task-packet.json
candidature.aaaat-task.zip
stage-*.json
```

The JSON report is suitable for scripts. The Markdown report is intended for human review.

Exit status is zero only when every automated stage passes. Real-environment manual gates remain pending until separately recorded.
