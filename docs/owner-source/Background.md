## Background

AAAAT v2 is a **clean restart** of the AgentAgnostic Auto Application Tracker, informed by the useful workflows demonstrated in `AgenticCareerBoost` and by the architectural lessons learned from the failed AAAAT v1 prototype.

AAAAT v1 should be preserved as engineering history and discovery evidence, but **no source-code, database-schema, API, protocol, or data migration compatibility is required**. The prototype has no active users and contains no production data worth preserving. V2 is therefore free to design its domain model and implementation exclusively around current product requirements.

The redesign follows the principle:

> **Preserve the problem, product knowledge, useful workflows, privacy principles and visual lessons. Discard the previous implementation contracts.**

AAAAT is a **personal, local-first career workspace** intended to demonstrate strong software-engineering practices while remaining small, understandable and maintainable by a single developer.

Its core responsibilities are:

- maintain and navigate candidatures;
- maintain reusable professional/profile information;
- prepare useful candidature summaries for recruiter calls, interviews and assessments;
- analyse job opportunities when AI assistance is enabled;
- generate and manage CVs and cover letters;
- maintain generated artifacts and their source material;
- allow all essential workflows to operate manually;
- integrate with a broad range of AI applications without making any specific AI ecosystem part of the core domain.

The product must support three interaction directions:

**Human → AAAAT**  
Every essential capability is available through a coherent graphical interface. A normal user must never need to manipulate JSON, protocols, shell commands or intermediate exchange files. The interface should also avoid presenting users with large collections of empty fields: progressive disclosure, sensible defaults and focused workflows should make incomplete data feel normal rather than erroneous. fileciteturn0file0

**AAAAT → AI**  
When a user requests AI assistance from inside AAAAT, AAAAT remains responsible for the experience. It selects the configured connection, prepares the allowed context, invokes the AI runtime/provider, validates the response and presents the result through AAAAT's interface. An integration that cannot provide a sufficiently reliable user experience should not be exposed as an ordinary one-click capability. fileciteturn0file0

**AI → AAAAT**  
External AI applications may invoke selected AAAAT capabilities. Different integrations may use APIs, MCP, skills/plugins, commands, controlled filesystem exchange or, only as a fallback, copy/paste. These mechanisms exist to provide a unified AAAAT experience rather than becoming separate product workflows. fileciteturn0file0

### VCVGenerator as a core capability

**VCVGenerator (VCVG) is a primary reason for the AAAAT v2 redesign and is part of the core product, not a future extension.**

VCVG evolves the document-generation ideas explored in AgenticCareerBoost into an integrated AAAAT capability for:

- generating CVs from reusable and document-specific professional data;
- generating cover letters;
- generating CV and cover letter as a combined document where useful;
- supporting multilingual document content;
- managing shared LaTeX definitions/templates;
- exposing the input data, TeX sources and rendered artifacts clearly;
- allowing users to inspect and edit generated content before rendering;
- selecting, overriding or hiding individual pieces of professional data;
- deriving a document from normal AAAAT profile data while allowing a CV to intentionally diverge from the user's current job-search profile.

Privacy filtering must occur **before AI context is constructed**. Hidden fields may be omitted or replaced with aliases/fake values for AI operations while the authoritative values remain locally available for final rendering. This reduces unnecessary disclosure but cannot protect information from an external agent that already has unrestricted filesystem or screen access. fileciteturn0file0

### Installation and configuration as product infrastructure

The project also requires a shared installation/configuration harness, provisionally called `installer.ai`.

It must support both:

- a normal guided AAAAT setup UI; and
- AI-assisted installation/configuration when the user chooses to involve an external assistant.

The same structured configuration knowledge should drive both experiences. It should eventually cover AAAAT dependencies, LaTeX/MiKTeX guidance, AI connections and their provider-specific integration artifacts, VCVG initialization, test document rendering, and configuration import/export. fileciteturn0file0

This capability is **core infrastructure**, but its implementation must remain incremental. The project should not create a large installation framework before the first useful installation path exists.

### Development philosophy

AAAAT is a personal project aspiring to production-grade engineering standards. Architecture must therefore optimize for:

1. **clarity;**
2. **maintainability by one developer;**
3. **small and explicit abstractions;**
4. **strong local ownership and privacy boundaries;**
5. **demonstrable interoperability;**
6. **directly useful product capability.**

The redesign must avoid substituting enterprise-style architecture for engineering quality.

Implementation should proceed through **small end-to-end vertical slices**, each leaving AAAAT in a usable state. VCVG, candidature management, AI integration and installation/configuration may become progressively richer, but none should require a large independent platform or multi-stage programme before delivering useful behavior.

AAAAT v2 can therefore be summarized as:

> **A private local career workspace centered on candidature management and CV/cover-letter creation. It is fully useful without AI, directly uses configured AI when assistance is requested, and can expose controlled capabilities to external AI tools without allowing those integrations to dominate the application architecture.**