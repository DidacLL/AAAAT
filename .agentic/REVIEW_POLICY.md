# Review Policy

Default topology:

```text
Builder → Reviewer → Integrator
```

Reviewer challenges Builder assumptions and reports concrete evidence-backed findings. Use a separate reasoning context or specialist when the change's risk or novelty makes that useful. Material corrective changes invalidate the affected review; the Integrator decides whether a correction requires review to repeat.

Security, privacy, renderer isolation, local data ownership, complete human operability without AI, and portable user-owned output are hard review and merge gates where applicable. They are not preferences to trade against simplicity, convenience, or schedule; changing a governing constraint requires the corresponding authoritative decision.

## Security review scope

AAAAT's security gate covers authority AAAAT owns: authoritative local state, explicit domain/data structures, application-service mutation paths, typed/domain validation, disclosure boundaries, integration capabilities, and process/renderer privilege boundaries.

AAAAT does not own or secure an external AI model's reasoning, prompt interpretation, provider internals, network, or research behavior. Provider output is untrusted operation-scoped input; the architectural defense is bounded context/capabilities plus normal domain validation and mutation rules, not model obedience.

A Reviewer must block broad or generic AI/local mutation authority, bypass of application services, arbitrary database/filesystem/shell/process/repository exposure, renderer privilege weakening, unintended disclosure contrary to configured operation context, silent overwrite where an operation forbids it, or mandatory AI dependence for normal use.

A Reviewer must not invent a blocker solely because AAAAT lacks prompt-injection detection, an AI firewall, adversarial prompt sanitization, cryptographic privacy placeholders, generic model-security middleware, or a universal human-approval queue. Privacy token/replacement mechanics are product implementation details unless a concrete correctness invariant is violated. Explicitly scoped Sources may be used by an operation whose purpose requires them; retained Sources must not be implicitly dumped into unrelated operations.

## Priorities after gates pass

1. correctness
2. approved product behavior
3. simplicity
4. maintainability
5. portability
6. testability
7. ecosystem convention
8. hypothetical future flexibility

## Required search

Reviewers actively search for scope expansion, OWNER_INTENT/SPEC violations, duplicate mutation paths, unused abstractions, premature frameworks, human workflows depending on AI, renderer security weakening, privacy leaks, non-portable LaTeX, v1 architecture leaking into v2, and tests that freeze incidental implementation structure.

For user-facing changes, the same Reviewer must also check:

- **Additive drift:** did the change invent product behavior not supported by Owner Intent or an unambiguous derived SPEC requirement?
- **Subtractive drift:** did it remove, weaken, or silently postpone an Owner requirement?
- **Prescriptive drift:** did an optional capability become mandatory or a default become a required workflow?
- **Restrictive drift:** did "not fundamental" or "not currently required" become "forbidden"?
- **Workflow drift:** did schema structure, Mission order, AI operations, or acceptance tests become an assumed user workflow?
- **Special-case drift:** was common information/field behavior unnecessarily hard-coded to one field or type?
- **Over-generalization:** did legitimate reusable behavior expand into a generic framework unrelated to demonstrated AAAAT needs?

Blocking product drift prevents merge even when tests are green or the behavior already exists in implementation history.

Deletion is a valid recommendation. Executable evidence outranks agent opinion or committee majority, but executable evidence cannot establish product meaning that conflicts with higher Product Owner authority.

## Integration outcomes

- `MERGE`: acceptance criteria and relevant CI pass; applicable hard gates and product-drift checks pass; no blocking finding, unjustified complexity, undocumented Class C decision, unresolved product-meaning question, or Class D change remains.
- `CORRECT`: Builder corrects the same branch; the Integrator determines which verification and review evidence must repeat.
- `COMMITTEE`: a minimal relevant expert group evaluates materially unresolved technical evidence; it does not invent unresolved product meaning.
- `OWNER_DECISION`: a concrete unresolved Product Owner or Class D question is prepared.
