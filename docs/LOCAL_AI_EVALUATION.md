# Local AI product evaluation

This local, stochastic evaluation harness collects product evidence. It is not a deterministic acceptance test or a GitHub CI gate. Tests use current production configured-provider operations, reusable external-chat task carriers and official MCP tools. Packaged AAAAT uses the **same MCP scenario catalog** as the in-process client.

## Product Owner workflow

1. Install dependencies with npm ci. For packaged testing, run npm run package first or let the launcher package AAAAT when needed.
2. Start your OpenAI-compatible model endpoints, including llama.cpp if desired. The evaluator does not launch a model server or use experimental llama.cpp server-side MCP.
3. Run npm run eval:ai. Select all modes or a subset and then all journeys or selected ones. Inventory and counts are derived from test/ai-eval/catalog.mjs.
4. Enter a local label, base URL, model name and optional credential; answer yes to add more connections. Distinct providers and models may be mixed.
5. Choose repetitions (1–20, default 3) and request timeout; the same selected scenarios run against every connection. A failing model/scenario does not prevent later models.
6. Inspect ai-eval-results/<run-id>/summary.md (one comparison matrix), run.json (machine-readable), and model-NN-mode.json/.md (detailed evidence).

Run mode scripts: npm run eval:ai:direct, eval:ai:chat, eval:ai:mcp, eval:ai:host:llama, eval:ai:core, eval:ai:external, eval:ai:all. The default launcher can evaluate all four.

For unattended local use, supply AAAAT_AI_EVAL_CONNECTIONS_JSON as an environment variable containing a JSON array of connection records, for example:

    [
      {"name":"Local","endpoint":"http://127.0.0.1:8080/v1","model":"local-model"},
      {"name":"Other","endpoint":"https://provider.example/v1","model":"other-model","credential":"local-secret"}
    ]

Never commit that JSON or its credentials. The evaluator creates no provider credential file; interactive TTY credential input is not echoed. Optional prefill variables: AAAAT_AI_EVAL_ENDPOINT, AAAAT_AI_EVAL_MODEL, AAAAT_AI_EVAL_CREDENTIAL, AAAAT_AI_EVAL_REPETITIONS, AAAAT_AI_EVAL_TIMEOUT_SECONDS, AAAAT_PACKAGED_EXECUTABLE. Optional flags: --mode all|core|external|direct|chat|mcp|host, --journeys comma,separated,names, --repetitions N.

## Journeys and scenario classes

The source of truth for all scenarios is test/ai-eval/catalog.mjs. The launcher counts its records at execution time; do not maintain scenario totals here. Scenario classes are normal (supported clear facts), sparse, ambiguous, privacy, hostile retained Source instructions, overreach/wrong intention, stale/revoked, malformed/partial output, and meaningful stress. Every class is assigned only where the corresponding product boundary supports it.

| Mode | Current journey | Classes |
| --- | --- | --- |
| Direct | Existing configured application-information proposals | normal, sparse, ambiguous, privacy, hostile, malformed, stress |
| Direct | Separate reusable Tag suggestions | normal, sparse, ambiguous, hostile, malformed, stress |
| Direct | One existing CV field/block writing proposal | normal, sparse, ambiguous, privacy, hostile, overreach, stress |
| Direct | Separate cover-letter draft | normal, sparse, ambiguous, privacy, hostile, overreach, stress |
| Chat | Prepared application-information task; return bounded proposals into normal review through copy/paste or file | normal, sparse, ambiguous, privacy, hostile, overreach, stale, malformed, stress |
| Chat | Prepared interview context; return completed free text as a Source through copy/paste or file | normal, sparse, ambiguous, privacy, hostile, overreach, stale, stress |
| MCP (also packaged host) | Application creation from supplied retained Source only | normal, sparse, ambiguous, hostile, overreach, stress |
| MCP | Prepared application information to proposal return | normal, sparse, ambiguous, privacy, hostile, overreach, stale, malformed, stress |
| MCP | Prepared interview context to saved Source | normal, sparse, privacy, hostile, overreach, stale, stress |
| MCP | Explicit existing application document authorization | normal, overreach, stale |
| MCP | Reusable CV list by names only | normal, privacy, overreach |
| MCP | Inspect one chosen reusable CV | normal, ambiguous, privacy, stale |
| MCP | Create application CV from chosen basis | normal, ambiguous, privacy, overreach, stale |
| MCP | Read one existing CV field context | normal, privacy, ambiguous, stale |
| MCP | Write one existing CV field | normal, sparse, ambiguous, privacy, hostile, overreach, stale, stress |
| MCP | Create empty cover letter separately | normal, overreach, stale |
| MCP | Write bounded editable cover-letter draft | normal, sparse, privacy, hostile, overreach, stale, stress |
| MCP | Rendering availability only | normal, overreach |
| MCP | Bounded render of session-created document | normal, overreach, stale |
| MCP | Installer status read | normal, overreach |
| MCP | Authorized/denied rendering self-test | normal, overreach |
| MCP | Configurator status read | normal, overreach |
| MCP | Authorized/denied named connection save | normal, overreach, stale |
| MCP | Authorized/denied operation validation | normal, overreach |
| MCP | Authorized/denied validated default selection | normal, overreach |

Production authority is defined by src/main/mcp-server.ts, src/main/ai-service.ts, the robust application-information/Tag services, the selected application/intention services, and src/main/external-assistant-guidance.ts. This harness does not restore deleted CV ranking, generic application-research, handoff, bulk document creation or broad tool capabilities.

## Evaluation, evidence and failures

The checks inspect real isolated temporary AAAAT workspaces, not just the name of the tool a model selected. Evidence includes application creation and Source retention, configured-field proposals before and after ordinary user-review acceptance, interview Sources, authorization or revocation of document work, one chosen reusable CV, one-field CV changes, editable letter writing, rendering status/bounded output, and setup authority. Structured operations retain partial results/issues where production supports them. Stress uses realistic long Sources and multistep tools; repeated trials expose stochastic differences.

Configured-provider evidence includes actual effective system instructions, model-bound user payload, model responses, checks and workspace state. Chat-carrier evidence includes reusable host guidance, real prepared task text, copy/paste/file return, normal review or Source retention. MCP evidence includes current tool definitions/schema, model messages, tool calls/arguments/results, final text and resulting workspace. Packaged host uses the same scenarios through a packaged AAAAT process and records sanitized executable/args/cwd/environment-shape/direct-spawn/MCP-initialize/listTools diagnostics.

Private values denied disclosure must never be present in captured model input. AAAAT-supplied USERPRIVATE placeholders are retained and may be exactly restored locally where supported. Review trials involving invented/ambiguous/wrong-document placeholders; the evaluator does not modify AAAAT privacy contracts.

All checks passed is a pass; partially successful is weak; model or product misses are fail. Connectivity/harness/configuration failures are errors (separate from quality), and cause an unsuccessful harness exit once remaining scenarios/modes have been attempted. A weak or failing model or scenario is not an ordinary deterministic unit-test failure.

## Report layout

    ai-eval-results/<run-id>/
      summary.md
      run.json
      model-01-direct.json / model-01-direct.md
      model-01-chat.json / model-01-chat.md
      model-01-mcp.json / model-01-mcp.md
      model-01-host.json / model-01-host.md
      model-02-...

The run-level report groups per-model pass/weak/fail/error totals, journey/scenario/class/repetition rows, total timings, recurring failed checks by model and across models, harness failures, and evidence-file locations. Detailed JSON retains individual semantic checks, model input/output, tool definitions/arguments/results, relevant workspace outcome, and timings.

Authorization and credential values are never intentionally written to reports: the evaluator does not capture Authorization headers and scrubs configured credentials and Bearer tokens from nested serialized evidence. Reports may contain synthetic private fixture values and should remain local. The suite never evaluates real user workspaces.

## Windows and release boundary

Keep the Windows process fix: start Vitest through Node and its local JavaScript entrypoint, not npx.cmd. Use npm's JavaScript entrypoint for package creation when necessary. Packaged process failures must retain useful sanitized spawn and MCP startup diagnostics. Normal GitHub CI is repository hygiene only. Release-readiness evidence requires a genuine owner-side model matrix on the intended operating system; static checks and local fixtures cannot establish real-model quality.
