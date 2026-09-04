# ADR 0014 — Structural security and external-AI boundary

- Status: Accepted
- Date: 2026-09-04
- Decision class: C
- Issue: #152

## Context

AAAAT already keeps authoritative data local, routes durable changes through explicit application services, validates typed/domain contracts, restricts renderer and integration privileges, and gives AI only bounded operation-specific context and capabilities.

Review drift nevertheless treated privacy-token mechanics and possible failures of an external model's reasoning as if they were AAAAT's primary security boundary. That interpretation would push AAAAT toward prompt-injection defenses, AI firewalls, token-security protocols, generic approval workflows, and other machinery for a model/provider that AAAAT does not own.

## Decision

AAAAT security is structural.

AAAAT protects the authority it owns through simple explicit product-specific data structures, authoritative local state, narrow application-service mutation paths, typed/domain validation, bounded integration capabilities, and process/renderer privilege boundaries.

AAAAT does not own or secure an external AI model's reasoning, prompt interpretation, provider internals, network, or research behavior. External AI may produce arbitrary or incorrect output; AAAAT treats that output as untrusted operation-scoped input and subjects it to the same bounded domain validation and mutation rules that protect authoritative data.

Privacy projection is separate from the authority boundary. An operation may expose, omit, or locally replace/tokenize information. Authoritative private literals remain local when omitted or replaced. Placeholder syntax, token generation, collision strategy, and restoration implementation are replaceable details unless a concrete correctness defect makes one relevant.

There is no universal `AI -> proposal -> human approval -> mutation` architecture. Each operation defines its own typed output and conflict/mutation policy, then uses normal application services. Proposal-only behavior is appropriate where an operation requires it; valid bounded results may be applied directly where that operation permits it.

Sources remain explicit retained domain objects. They are not implicitly dumped into unrelated AI requests and are not globally forbidden from AI. A bounded operation may receive explicitly scoped Source material when its product purpose requires it and normal privacy/context rules permit it.

AAAAT does not add prompt-injection detection, an AI firewall, adversarial prompt sanitization, generic model-security middleware, cryptographic placeholder protocols, or a generic AI policy engine merely because an operation uses AI. Such a subsystem requires a separate demonstrated AAAAT-owned need.

## Consequences

- Security reviews focus on AAAAT-owned authority, disclosure, validation, mutation, and privilege boundaries.
- A hostile or confused model cannot gain broad local authority because that authority is not exposed to it.
- Privacy controls remain useful product functionality without becoming a second security architecture.
- AI operations remain simple and product-specific.
- Tests prove disclosure, validation, mutation, conflict, and restoration behavior rather than incidental tokenizer or prompt mechanics.
- Manual/no-AI operation remains complete.
- No new runtime framework or security subsystem is introduced by this decision.
