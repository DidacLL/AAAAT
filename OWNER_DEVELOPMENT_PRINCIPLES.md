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

The repository should remain understandable and maintainable by one developer assisted by AI.

Complexity requires demonstrated value.

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

Avoid freezing incidental implementation details such as DOM object identity, click order without semantic relevance, token syntax, internal array order or current architectural mechanisms.

## Historical implementation does not create product meaning

Code, tests, ADRs, old Issues and old Missions are evidence.

They do not create a requirement merely because they exist or previously passed review.

When they conflict with the Product Definition, product meaning wins.

## Pre-user data is disposable unless explicitly declared otherwise

Until a real-use compatibility baseline is deliberately established, development databases, fixtures and fake workspaces do not justify preservation architecture.

Do not build migration/compatibility ceremony to protect nonexistent users.

Migration machinery may still be used where it is the simplest sound technical architecture.

## Preserve proven technical boundaries when useful

Do not discard technically sound foundations merely because product drift occurred above them.

Security, local ownership, typed boundaries, portable documents and other proven infrastructure should be evaluated separately from the product assumptions historically attached to them.

## Reviews should challenge drift, not merely Issue compliance

Reviewers should consider whether the Issue itself still expresses product meaning correctly.

Important drift classes include additive drift, subtractive drift, semantic drift, implementation leakage, AI-assistant leakage, workflow drift, historical-name drift, test ossification, compatibility ceremony and process over-fragmentation.

## Documentation should remain layered and small

Separate product meaning, explanatory product context, raw owner evidence, technical architecture and current execution state.

Do not solve memory problems by making every document authoritative or by creating a requirements database.

## Prefer meaningful completion states

A completed development step should normally leave the application in a more useful coherent state, not merely satisfy an internal architecture milestone.

Development order is not user workflow, but development should visibly converge toward a usable product.
