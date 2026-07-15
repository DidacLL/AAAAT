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

## Ollama profile

```bash
aaaat-release-validate \
  --runtime ollama \
  --model qwen3:8b \
  --evidence-dir release-evidence-ollama
```

Override the executable or append runtime arguments when needed:

```bash
aaaat-release-validate \
  --runtime ollama \
  --model my-local-model \
  --executable /path/to/ollama \
  --arg value
```

AAAAT invokes the local CLI as a subprocess. It does not configure an Ollama HTTP client or store provider credentials.

## llama.cpp profile

```bash
aaaat-release-validate \
  --runtime llama-cpp \
  --model-path /path/to/model.gguf \
  --executable /path/to/llama-cli \
  --evidence-dir release-evidence-llama
```

Additional `llama-cli` arguments may be supplied with repeated `--arg` options.

## Custom CLI profile

Use this for Copilot CLI, LM Studio CLI, Colibrì or another user-owned connector that reads one bounded task object from stdin and writes one result object to stdout:

```bash
aaaat-release-validate \
  --runtime custom \
  --command-json '["/path/to/connector", "--fixed-argument"]' \
  --evidence-dir release-evidence-custom
```

The custom command receives no direct database path or broad entity authority.

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
