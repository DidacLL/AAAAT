# AAAAT Owner Development Principles

**Status: Product Owner development guidance.**

This document governs how AAAAT should be evolved. It is separate from product meaning.

## Useful development over ceremony

Move quickly toward meaningful working product.

Do not convert every capability into a long chain of microscopic Issues, reviews and governance transitions merely because finer decomposition is possible.

Use bounded work, but choose coherent slices large enough to produce meaningful progress.

## Avoid overengineering

Prefer the smallest coherent architecture that supports the real product.

Do not add frameworks, registries, generic abstractions, plugin systems, workflow engines, event buses, repositories or policy layers without demonstrated product need.

Avoid both giant unreviewable changes and artificial micro-slicing.

## One developer plus AI is a real constraint

AAAAT is a single-developer personal side project. The repository should remain understandable and maintainable by one developer assisted by AI.

Do not import enterprise, multi-user, release-management, compatibility, provider-platform or generic security ceremony merely because those patterns are conventional in commercial software.

Complexity requires demonstrated current value.

## Engineering owns engineering verification

The Product Owner is not the routine QA department.

Agents and CI should find ordinary technical regressions, packaging failures, compatibility problems and test issues before requesting owner attention.

Owner evaluation is most valuable for unresolved product meaning, genuine UX/product judgment and meaningful integrated acceptance.

## Autonomous agents should proceed without routine questions

Agents should use Product Definition, Product Context, owner-source material and repository evidence before escalating.

Do not ask the owner to repeat decisions or clarifications already preserved.

Escalate only genuine unresolved product ambiguity or consequential trade-offs that cannot be resolved from existing material.

## Tests protect behavior, not incidental mechanisms

Tests should protect user-observable behavior, domain invariants, security/privacy/local-ownership boundaries and important failure semantics.

Avoid freezing incidental implementation details such as DOM object identity, click order without semantic relevance, token syntax, internal array order, migration numbers/hashes or current architectural mechanisms.

A passing test is not evidence that its premise is correct. If the test protects a development-era assumption that current product meaning does not require, change or delete the test.

## Historical implementation does not create product meaning

Code, tests, ADRs, old Issues and old Missions are evidence.

They do not create a requirement merely because they exist or previously passed review.

When they conflict with the Product Definition or current explicit Product Owner instruction, product meaning wins.

When a later feature exposes a weakness in an earlier model, correct the earlier model instead of wrapping it in compatibility code. Do not preserve sunk implementation effort as an architectural constraint.

## No pre-user schema compatibility programme

AAAAT currently has no users and no established real-use compatibility baseline.

Development databases, migration sequences, fixtures and fake workspaces are disposable. Git history is sufficient history for discarded development representations.

Until the Product Owner explicitly establishes a real user-data baseline and asks for compatibility:

- do not preserve old development schemas;
- do not add numbered migrations to protect intermediate development states;
- do not retain migration infrastructure for hypothetical future upgrades;
- do not reconstruct old development workspaces in tests;
- correct the current schema, contracts, services and tests directly when product understanding improves.

Compatibility design begins only when there is an actual compatibility obligation.

## AAAAT does not own the AI ecosystem

AAAAT may use AI as optional information processing and may expose bounded AAAAT operations through transports such as MCP. That does not make AAAAT an AI platform or agent framework.

AAAAT owns its local data, local process boundaries, validation and mutations. It does not automatically own an external AI/provider's reasoning, policy, model security, account authentication, credential lifecycle, compatibility guarantees or orchestration concerns.

Do not introduce generic AI-security, provider-authentication, permission, registry or orchestration architecture unless a concrete AAAAT feature genuinely owns that responsibility.

## Flexible user information must stay flexible

Developer-supplied professional-information categories are defaults, not a permanent taxonomy.

The product must be able to retain legitimate reusable career information outside the initial developer list without requiring a new schema migration or code feature for each new category. Do not let an early closed enum silently become product meaning.

## Preserve proven technical boundaries when useful

Do not discard technically sound foundations merely because product drift occurred above them.

Security, local ownership, typed boundaries, portable documents and other proven infrastructure should be evaluated separately from the product assumptions historically attached to them.

Preserve a boundary only when the current product independently justifies it.

## Reviews should challenge drift, not merely Issue compliance

Reviewers should consider whether the Issue itself still expresses product meaning correctly.

Important drift classes include additive drift, subtractive drift, semantic drift, implementation leakage, AI-assistant leakage, workflow drift, historical-name drift, test ossification, compatibility ceremony, imported industry assumptions and process over-fragmentation.

A reviewer must not treat existing schemas, migrations, ADRs or green CI as a reason to suppress a product inconsistency.

## Documentation should remain layered and small

Separate product meaning, explanatory product context, raw owner evidence, technical architecture and current execution state.

Do not solve memory problems by making every document authoritative or by creating a requirements database.

## Prefer meaningful completion states

A completed development step should normally leave the application in a more useful coherent state, not merely satisfy an internal architecture milestone.

Development order is not user workflow, but development should visibly converge toward a usable product.

Do not estimate completion primarily from issue count, milestone count or internal architectural consistency. Integrated owner-visible product behavior and fidelity to product intent are the meaningful measures.


## Current product-shaping phase: do not generate tests

AAAAT is still being actively shaped at the product, interaction and visual-architecture level. Agents must not create or retrofit tests after implementation merely to justify, freeze or certify that implementation.

Until the Product Owner explicitly authorizes a test-design phase:

- implementation specialists do not add, rewrite or expand tests unless explicitly asked;
- existing tests do not create requirements and do not drive product changes;
- failing stale tests are not implementation blockers by themselves;
- green tests are not acceptance evidence;
- test maintenance must not consume product-development runs;
- visual/UX work is evaluated from production code and the real running/rendered application;
- TDD is reserved for deliberately pre-specified stable contracts, not for current evolving UX work.

The repository merge gate should enforce static engineering hygiene only. Broader testing strategy can be designed later, once architecture and product behavior are intentionally stable.

## Tests never drive product development

Tests are subordinate verification artifacts. Product Definition and current explicit Product Owner intent drive development.

Never change product behavior, interaction, UX, visual composition, architecture, persistence, compatibility policy, or fixtures merely to make an existing or newly written test pass.

When a test fails:
1. validate the premise against current product authority;
2. if the premise is valid, fix the product defect;
3. if the premise is obsolete, arbitrary, implementation-shaped, fixture-specific, or contradicted by current intent, delete or rewrite the test.

A green suite can show that checked behavior still holds. It cannot establish that the checked behavior was the right requirement.

## No reassurance tests or implementation-lock tests

Automated tests exist to detect meaningful regressions in product behavior and durable technical boundaries. They are not a ritual that must accompany every code change, and they must not be manufactured to make an implementation appear safer than it is.

Do not add tests whose main effect is to mirror or freeze the implementation that was just written. In particular, do not use mocked/unit tests to “prove” visual quality, information hierarchy, spacing, card composition, CSS choices, DOM structure, component boundaries, class names, or other arbitrary rendering mechanisms.

A new test is justified only when a failure would correspond to a real product regression independent of the current implementation strategy. Prefer tests of user-observable behavior, domain invariants, meaningful failure handling, accessibility semantics, security/privacy/local-ownership boundaries, and stable cross-component contracts.

For UX and visual work:
- use automated tests for behavior that can be expressed meaningfully, such as what action opens/collapses/saves/routes, which data is visible or reachable, keyboard/accessibility semantics, or whether an error is surfaced;
- use real rendered/packaged evidence for layout, hierarchy, density, readability, visual identity, responsive composition and aesthetic acceptance;
- do not substitute CSS/DOM assertions, mocked screenshots, class-name checks or implementation-shaped snapshots for rendered product evidence;
- if no meaningful automated regression test exists, do not invent one merely to increase the passing-test count.

Mocking is acceptable when it isolates a real contract or unavoidable external boundary, but mocked success must not be presented as evidence for a real integration, rendered UX, provider behavior, package behavior or end-to-end journey it does not exercise.

Delete or rewrite tests that protect an obsolete or wrong premise. Test quantity, green CI and newly added “focused tests” are not acceptance criteria by themselves.
