# Maintainer correction: llama.cpp transport

Status: authoritative correction for AAAAT v1.

Date: 2026-07-15.

This document records direct maintainer instruction and therefore overrides older requirements, tests and planning text where they require `llama-cli`, a port-free llama.cpp subprocess, or noisy console-output parsing.

## Decision

The standard llama.cpp integration uses a user-owned `llama-server` process through an explicitly configured loopback HTTP endpoint.

AAAAT must:

- connect only to an endpoint explicitly entered by the user;
- restrict the standard adapter to HTTP loopback hosts;
- send bounded task prompts through `/v1/chat/completions`;
- require non-streaming responses;
- derive schema-constrained `response_format` from the task's existing response contract;
- validate assistant content as one JSON object before existing domain validation;
- keep the OpenAI-inspired route shape inside this transport adapter rather than making it the AAAAT protocol;
- keep the generic fixed-argv stdin/stdout adapter for other local and future runtimes;
- leave model installation, server launch, server shutdown, acceleration, arguments and network policy under user ownership;
- never silently launch, discover or select a llama.cpp server.

AAAAT must not:

- use `llama-cli` as the standard llama.cpp execution path;
- scrape interactive terminal rendering to recover model output;
- require a llama.cpp SDK or OpenAI client library;
- expose an AAAAT listening port;
- treat the llama.cpp transport as the provider-neutral core contract.

## Release proof

The deterministic provider-neutral command fixture remains the CI portability proof. A real llama.cpp manual validation uses the explicit loopback server adapter and must complete conformance, profile completion and the candidature lifecycle through the same bounded task/result and domain-validation pipeline.
