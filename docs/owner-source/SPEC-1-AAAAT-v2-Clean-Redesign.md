# SPEC-1-AAAAT-v2-Clean-Redesign

## Background

AAAAT v2 is a clean redesign of the AgentAgnostic Auto Application Tracker, informed by two previous bodies of work:

1. **AgenticCareerBoost**, which demonstrated useful local career-management and document-generation workflows.
2. **AAAAT v1**, which demonstrated valuable product concepts but also exposed architectural assumptions that should not become compatibility requirements for the next implementation.

AgenticCareerBoost is intentionally a personal career workspace and engineering proof repository rather than a reusable product architecture. Its most valuable surviving workflow is simple and concrete: private local career data is transformed into LaTeX CV/cover-letter material and rendered locally, while sensitive candidature information remains outside the public repository. citeturn912374view0turn605338view1 Its existing cover-letter workflow already demonstrates the useful separation between structured private input, generated TeX, and final PDF artifacts. citeturn439250view0turn439250view1

AAAAT v1 expanded that idea into a private desktop candidature workspace. It established several product principles worth preserving: candidature-centered organization, local SQLite ownership, manual operation without AI, reusable professional context, local artifacts, fast recruiter/interview views, and the ability to back up or move the workspace independently of the application. citeturn605338view0

However, AAAAT v1 coupled those product goals to an architecture in which AAAAT deliberately avoided becoming the AI client. Instead, an external AI host was expected to execute reasoning and communicate with AAAAT through MCP, capability-controlled operations, watched files, or tagged text exchange. The normal onboarding flow consequently required AAAAT to generate connection instructions that were transferred to another AI application. citeturn605338view0turn439250view3

The architecture audit concludes that this should be considered a successful discovery prototype but a failed production architecture. The redesign therefore follows the principle:

**Preserve the problem, product knowledge, data semantics, useful workflows, privacy principles, and visual lessons. Discard implementation contracts that exist primarily because of the v1 architecture.**

The owner requirements extend the redesigned product beyond a simple tracker. AAAAT must become a unified local career workspace that supports three equally legitimate modes of operation:

- **Human → AAAAT:** every important function can be performed through a professional GUI without JSON, shell commands, protocol knowledge, or mandatory AI.
- **AAAAT → AI:** the user initiates an assisted operation from AAAAT and AAAAT invokes a configured AI connection while preserving a unified AAAAT experience.
- **AI → AAAAT:** an external AI application may initiate supported AAAAT operations through an appropriate integration mechanism when that mechanism can provide a reliable experience.

The normal product must remain understandable to users with little technical knowledge. Advanced integration mechanisms may exist, but implementation details such as MCP, APIs, skills, plugins, filesystem exchange, or provider-specific harnesses must not leak into ordinary workflows unless the user deliberately enters advanced configuration. Copy/paste or file-mediated exchange may remain available as compatibility fallbacks, but they are not the preferred normal interaction. fileciteturn0file0

The redesign also introduces **VCVGenerator (VCVG)** as a first-class AAAAT capability. VCVG generalizes the proven AgenticCareerBoost document workflow into managed CV and cover-letter generation. It must support reusable and candidature-specific career data, multilingual documents, editable intermediate content, local LaTeX rendering, combined CV/cover-letter output, explicit artifact locations, and privacy controls over which values may be exposed to an AI provider. fileciteturn0file0

Privacy must therefore be enforced at the application boundary rather than being expressed only as an AI instruction. AAAAT must distinguish authoritative local values from the representation supplied to an AI operation. Users may exclude fields or substitute privacy-safe aliases before context leaves the trusted application boundary, while accepting that an external agent with unrestricted filesystem or screen access cannot be protected by that mechanism. fileciteturn0file0

Installation and configuration are also part of the product rather than an external prerequisite. The redesign introduces an **installer/configuration harness**, provisionally referred to as `installer.ai`, capable of driving both a conventional guided UI and AI-assisted setup. It must handle AAAAT dependencies, document-rendering dependencies such as LaTeX, AI connection configuration, provider-specific integration artifacts where appropriate, initial CV/cover-letter configuration, and portable configuration import/export. The underlying installation knowledge should be machine-readable enough that the graphical installer and an external installation agent consume the same source of truth instead of maintaining separate instructions. fileciteturn0file0

AAAAT v2 is consequently not merely a rewritten candidature tracker. Its product boundary is:

**A private, local-first career workspace for tracking candidatures, maintaining reusable career knowledge, preparing for recruitment interactions, and producing application documents. It is complete without AI, can use AI directly when configured, and can expose controlled capabilities to external AI tools without allowing any specific AI ecosystem to define the core application architecture.**

The redesign is a clean implementation. The current Python/wxPython UI, AI task state machine, handwritten MCP implementation, watched-folder protocol, and existing database schema are research evidence rather than migration targets. Existing AAAAT data may be imported through an explicit migration/import tool if required, but v1 internal structures will not constrain the v2 domain model.