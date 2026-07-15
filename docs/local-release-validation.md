# Local release validation

Use `aaaat-release-validate` to automate the non-visual v1 acceptance gates in an isolated local store and collect evidence.

A successful run reports:

```text
AUTOMATED_GATES_PASSED
MANUAL_GATES_PENDING
```

Visual wx inspection, browser installation, rendered-document review and desktop responsiveness remain human gates.

## Deterministic self-test

This profile requires no external model or provider software:

```bash
aaaat-release-validate \
  --runtime deterministic \
  --storage .private-release-validation \
  --evidence-dir release-evidence
```

It validates the provider-neutral bounded command boundary, fake-data conformance, profile completion, candidature lifecycle, safe retry, portable bundle export, privacy filtering, local artifact rendering and desktop projection visibility.

## Runtime transports

AAAAT's task, result, authority and domain-validation contracts are provider-neutral. Transport adapters remain narrow implementation details.

- `llama-cpp` connects to an explicitly configured user-owned `llama-server` on loopback HTTP.
- `custom` invokes a fixed argv command without a shell, writes one bounded task object to stdin and reads one result object from stdout.

AAAAT does not install models, launch servers, discover endpoints, manage provider credentials or own runtime lifecycle.

## llama.cpp server reference profile

Start and manage `llama-server` separately. Bind it explicitly to loopback and select the local model yourself. Example for Windows PowerShell:

```powershell
& "V:\AI\llama.cpp\bin\llama-server.exe" `
  --model "V:\AI\models\model.gguf" `
  --host "127.0.0.1" `
  --port "8080" `
  --offline
```

Check the user-owned server:

```powershell
Invoke-RestMethod "http://127.0.0.1:8080/health"
```

Then run AAAAT in another shell:

```powershell
$validateArgs = @(
    "--runtime"
    "llama-cpp"
    "--endpoint"
    "http://127.0.0.1:8080"
    "--model"
    "local"
    "--storage"
    ".private-release-llama"
    "--evidence-dir"
    "release-evidence-llama"
)

aaaat-release-validate @validateArgs
```

The adapter sends one bounded prompt to `/v1/chat/completions`, requires `stream: false`, derives a JSON Schema from the task's existing `response_format`, and validates the returned assistant content as one JSON object before normal AAAAT domain validation.

The endpoint must use plain HTTP on an explicit loopback host (`127.0.0.1`, `localhost` or `::1`). Remote endpoints, credentials in URLs, endpoint discovery and automatic server launch are rejected.

The route resembles an OpenAI-style chat endpoint because llama.cpp exposes that transport. It is not AAAAT's core protocol and does not introduce an OpenAI SDK or provider dependency.

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
- return a nonzero exit code on failure;
- avoid database paths, internal IDs and broad AAAAT authority.

## Evidence

A run writes `release-report.json`, `release-report.md`, environment and runtime evidence, bounded task evidence, portable bundle evidence and one JSON file per stage.

Exit status is zero only when every automated stage passes. Real-environment manual gates remain pending until separately recorded.
