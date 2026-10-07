# Local AI journey evaluation

AAAAT's local evaluator is a stochastic product-evaluation harness, not a CI/release gate.

Run the interactive launcher:

    npm run eval:ai

It separates the product's AI interaction directions instead of treating direct provider calls as the whole AI surface.

## Run modes

    npm run eval:ai:direct
    npm run eval:ai:chat
    npm run eval:ai:mcp
    npm run eval:ai:host:llama
    npm run eval:ai:core
    npm run eval:ai:external
    npm run eval:ai:all

direct evaluates AAAAT -> AI operations.

chat evaluates no-local-computer / chat-driven journeys through the production reusable host guidance, Send to my AI task carrier, returned-result retention and the external application-handoff entrance.

mcp gives the real model the production MCP tool definitions and lets the model decide which AAAAT tools to call. Tool calls execute against the real AAAAT MCP server and temporary workspace. This is useful for refining tool descriptions, schemas and host guidance. It does not by itself prove third-party-host compatibility.

host:llama is a reference local-agent boundary backed by a real running llama.cpp/OpenAI-compatible model server. The evaluator sends every model request to that server while connecting directly to packaged AAAAT over its normal stdio MCP boundary. It does not depend on llama.cpp's experimental server-side MCP support.

core runs direct + chat + MCP. external runs chat + MCP + the llama.cpp-backed packaged-AAAAT host boundary. all runs every mode.

## Repetition and failures

The default is five repetitions per scenario. A model miss, malformed model output, weak answer or wrong tool choice is evidence and does not stop later trials.

A mode exits unsuccessfully only for a harness/configuration failure such as an unreachable endpoint, missing required local-host executable, or evaluator crash. The launcher still continues with other selected modes.

The current scenario counts are:

- direct AAAAT -> AI: 9;
- external chat / Send to my AI: 8;
- model-driven MCP: 8;
- representative llama.cpp local host: 4.

Thus the external-AI surfaces receive more scenario coverage in all than the direct inference surface.

## Connection prompts

Direct, chat and model-driven MCP modes ask for an OpenAI-compatible endpoint, model and optional Bearer/API credential.

The llama.cpp-backed host fixture asks for the same OpenAI-compatible endpoint/model connection as the other model-driven modes plus a packaged AAAAT executable. Start llama.cpp yourself with the model you want to evaluate, for example:

    llama-server -m C:\\models\\your-model.gguf --host 127.0.0.1 --port 8080 --jinja

Then use:

    http://127.0.0.1:8080/v1

as the endpoint. The evaluator connects to that running server, so its terminal shows the actual model requests. It separately spawns packaged AAAAT over stdio MCP. No second llama-server is started.

If no packaged AAAAT executable is found under out/, the launcher can build one before the host run.

Environment variables can prefill automation/local scripts:

    AAAAT_AI_EVAL_ENDPOINT
    AAAAT_AI_EVAL_MODEL
    AAAAT_AI_EVAL_CREDENTIAL
    AAAAT_AI_EVAL_REPETITIONS
    AAAAT_PACKAGED_EXECUTABLE

## What is evaluated

Direct mode repeatedly exercises the production AAAAT provider/service paths for application-information extraction, CV writing and cover-letter drafting.

External-chat mode exercises production Send to my AI context construction and reusable host guidance with opportunity research, interview preparation, one-off edited tasks, sparse context, privacy-hidden information, hostile/instruction-like context text and returned-result retention. It also measures whether current host guidance is sufficient for an external chat to produce the documented application-handoff format; failure is retained as evidence rather than patched around in the evaluator.

MCP mode evaluates model tool choice and round trips including application + document creation, Source-only candidature creation, selected-application research return, Career-context reads, setup-status reads, denied setup authority and requests for unsupported generic database/shell access.

The llama.cpp-backed host mode repeats representative application/document creation, selected-application return, Career-context use and bounded-authority journeys through a real local-agent process boundary: the model runs in the user's llama.cpp server and packaged AAAAT runs as the MCP child process.

## Reports

All modes in one launcher run write into:

    ai-eval-results/<run-id>/

Each mode writes Markdown and JSON. run.json records which modes completed or had harness/configuration failures.

JSON evidence retains the effective reusable guidance, task text or MCP tool definitions, model requests/responses, tool selections and arguments, tool results, retained workspace outcome, timings, semantic checks and error categories. Credentials and Authorization headers are not written.

Use repeated patterns across models and scenarios to decide whether a prompt, task template, tool description, response contract or carrier boundary should change. One lucky success is not acceptance and one stochastic miss is not a reason to stop testing.

Host/model fixtures are evidence fixtures, not AAAAT architecture.
