# Historical correction: llama.cpp transport

Status: superseded as v1 architectural authority.

Date: 2026-07-15.

This document records a historical correction that replaced an earlier `llama-cli` requirement with a loopback `llama-server` adapter. It remains useful as implementation history for that optional adapter, but it no longer defines the standard-user path, release proof or provider-neutral architecture.

Current authority: [`v1-authoritative-requirements.md`](v1-authoritative-requirements.md).

## Preserved implementation lessons

A llama.cpp HTTP adapter may remain when it:

- connects only to an endpoint explicitly selected by the user;
- sends only bounded AAAAT task context;
- keeps provider-specific route and response details inside the adapter;
- validates returned assistant content before canonical domain validation;
- leaves model installation, process lifecycle, acceleration, arguments, credentials and network policy under user or connector control;
- never silently launches, discovers or selects a runtime;
- grants no access to AAAAT storage, entity enumeration or mutation by internal IDs.

## Superseded claims

The following are not current product requirements:

- llama.cpp as the standard or mandatory integration;
- `llama-server`, `llama-cli` or any named runtime as release proof;
- loopback-only HTTP as a universal transport rule;
- a blanket prohibition on AAAAT listening transports;
- port-free execution as an architectural invariant.

Transport compliance is determined by bounded authority, declared disclosure, canonical validation and deterministic application—not by vendor name or whether a port is used.
