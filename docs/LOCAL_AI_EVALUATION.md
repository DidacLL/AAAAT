# Local AI journey evaluation

This is a local evaluation tool for AAAAT's real AI-assisted user journeys. It is deliberately not a CI gate.

Run:

    npm install
    npm run eval:ai

The launcher asks for:

- an OpenAI-compatible base URL;
- model name;
- optional API key / Bearer credential;
- repetitions per scenario (default 5);
- a per-request timeout (default 120 seconds).

The suite uses temporary AAAAT workspaces and synthetic application/career data. It exercises the production AI paths for:

- Source/job extraction;
- historical field recovery from retained Sources;
- opportunity review;
- CV tailoring;
- cover-letter drafting.

There are three materially different scenarios for each operation. Every scenario is repeated, so the default run is 15 scenarios x 5 repetitions = 75 real model trials.

## Evaluation behavior

A stochastic model miss does not stop the suite and does not make the evaluation process fail. Each trial is classified as pass, weak, fail, or error and the remaining trials continue.

Before the suite starts, AAAAT performs its normal connection probe. A bad endpoint/credential stops immediately because that is configuration failure, not model variance.

Reports are written under:

    ai-eval-results/<timestamp>-<model>/

The Markdown summary includes operation success rates, scenario stability, repeated failure signals, and current prompt size.

The JSON report additionally retains, for each real provider call:

- the effective system instruction;
- user payload sent by AAAAT;
- raw model response;
- structured-output mode;
- HTTP status and timing;
- local semantic checks and error category.

Credentials and Authorization headers are not written to the report.

## Purpose

Use repeated outcomes to find systematic prompt/contract problems rather than treating one lucky success or one stochastic miss as truth.

Typical signals worth acting on include:

- the model repeatedly putting field facts into Tags instead of field proposals;
- frequent schema/JSON failures on otherwise capable models;
- unsupported facts appearing in letters;
- weak evidence selection in CV tailoring;
- verbose prompts whose constraints do not improve repeated outcomes;
- regressions that appear only with lightweight/local models.

Prompt changes should be based on repeated evidence across scenarios/models. This evaluator does not make its expectations product authority and is not part of the merge/release gate.
