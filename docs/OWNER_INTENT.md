# AAAAT Owner Intent

**Canonical product meaning.** Current direct Product Owner instructions take precedence. [SPEC.md](SPEC.md) is the derived master architecture; Missions, Issues, ADRs, tests and implementation cannot redefine this intent.

## What AAAAT is

AAAAT is a private local workspace for capturing, maintaining, retrieving, and reusing career and opportunity information, and for creating application documents. It makes these activities convenient through a coherent graphical experience and optional integration with the user's chosen AI.

**AAAAT supplies context and dependable operations; the user or their chosen AI supplies judgment and intelligence.** Manual, imported, internally assisted and externally contributed information becomes the same ordinary editable user-owned information.

The user may start anywhere and retain as much or as little information as useful. Focus provides fast, configurable retrieval. CV and cover-letter work is independently core. Local ownership, controlled disclosure, portable documents, accessible setup, and maintainability by one developer govern the design.

## Freedom and convenient information

AAAAT remains fully human-operable without AI. Manual entry is not a privileged first step: input paths may be mixed freely. Assistance belongs near the information or document being worked on.

A raw offer, URL, recruiter message, application form, one field, existing CV or external conversation is a valid starting point. A candidature remains useful even when other information is never completed. Company, role, status, priority, next action and lifecycle maintenance are not prerequisites. Optional guidance, suggestions, checklists and AI opinions are allowed without becoming the governing workflow.

Sparse information is normal, not a defect or completeness score. Views balance populated information, discoverability, space and clutter; there is no universal rule to show or hide every empty field. Full candidature access supports inspection, editing, removal, sources, concepts, ToDos, documents and presentation/privacy controls without a giant static form. Ordinary navigation must not silently discard unsaved work.

Sources are explicit retained objects independent from extracted information. Multiple meaningful sources may coexist. Raw text, titles and URLs remain retrievable without extraction. Extraction never replaces the original source or removes manual control.

## Flexible information with distinct meanings

Useful information includes facts, compensation, dates, descriptions, requirements, research, strengths, concerns, questions, pitch, notes and application-form answers. This is vocabulary, not a mandatory catalogue. Users can add useful fields during normal use.

Every normal user-facing field/value supports inspection/editing, setting/removal where its domain permits, independent AI disclosure control, and eligibility for Focus with configurable visibility, order and relative prominence/space. Internal identifiers, hashes and migration metadata are excluded. Generation/transformation is a separate capability available only with suitable configured assistance. Hiding from AI does not hide from Focus; hiding from Focus does not delete information.

Share repeated behavior without erasing domain meaning or imposing one generic persistence model. Sources, candidatures, concepts, ToDos, professional profiles/variants, documents and artifacts remain distinct concepts.

- Concepts have a canonical term, aliases, a definition and user notes. They are shared across candidatures and support search and Focus.
- A ToDo is lightweight user text with a done/not-done state and optional candidature association. Scheduling, recurrence and AI task management are not implied.
- Canonical professional information and difference-based variants support reuse without cloned identities. Career direction, objectives, constraints and preferences are user-stated context; the current field catalogue is not a permanent limit.
- Working documents are editable. Retained application artifacts preserve the actual material used for an opportunity, independently of later edits or lifecycle tracking.

## Focus and retrieval

Focus makes relevant information quickly available during an unexpected call. Users control visibility, order and relative space. Sources, concepts, notes, questions, research, links, documents and ToDos participate through suitable presentation.

Company and role are useful default labels when available, but identification can use other available or configured information. Shipped presentation defaults do not establish universal importance. Focus is not a fixed recruiter script or preparation sequence. Preserve v1's configurable, dense retrieval lesson without its clutter or widget architecture.

Local corpus search is a product capability. Explicitly requested comparisons of selected candidatures may use AI with bounded context and understandable disclosure. AAAAT does not choose the user's career decision.

## VCVGenerator

CV and cover-letter creation/editing, including combined output, is independently core. No candidature or AI is required. Reusing canonical information should be convenient without requiring ordinary users to administer variants first.

Documents support editable content, reusable profile information, optional variants, deliberate document overrides, multilingual content, local rendering and clear access to portable source/PDF output. The exact source/PDF used for an application can be retained separately from the working document.

The stack is **LaTeX2e public API + expl3 implementation + pdfTeX through pdfLaTeX**. A reusable package serves managed blueprints and advanced users writing their own TeX. A feeder supplies validated data without silently overwriting user-authored blueprints or edited package sources. Generated projects belong to the user and compile outside AAAAT.

Begin with one useful blueprint. Detailed section design, executive/classic/dense variations, typography and language/font handling are deferred to LaTeX collaboration with the owner. That collaboration does not block unrelated recovery or justify a template marketplace. Multilingual support remains required.

## Controlled context and changes

An operation receives only the permitted information necessary for its purpose. AAAAT does not expose the candidature corpus or durable record, field, choice, item or variant identifiers for external profiling. Deliberately broader sharing requires an understandable user choice. Content itself can remain recognizable: omission of IDs cannot promise anonymity.

Privacy projection may expose, omit or locally replace a value. When replaced, the authoritative literal remains local and can be restored locally where the operation requires it. Concrete placeholder mechanics are replaceable details. Tags, notes, labels and document text can disclose meaningful private information too.

Retained Sources are never implicit context for unrelated operations. An operation may deliberately use explicitly scoped Source material when its purpose and privacy rules permit it.

Receiving information does not grant permission to change it. An input cannot broaden the operation's targets or acquire unrelated capabilities. Normal data structures, typed/domain validation, application-service mutations, conflict rules and process boundaries keep local state consistent. Some operations propose changes; others apply valid results directly under their own rules. There is no universal human-approval queue.

AAAAT does not own or secure the model's reasoning, prompt interpretation, provider internals, network or research behavior. Prompt-injection detection, an AI firewall and generic model-policy machinery are not the product boundary. Model output is ordinary input; model obedience is not relied on to protect local data.

## Chosen intelligence and external assistants

Extraction, drafting, transformation, terminology explanation, selected comparison and user-requested opinions are useful optional assistance. Retained results remain editable and are not more authoritative because a model produced them. An operation described as current research needs an actual research-capable route; ordinary inference is not current research.

External AI is a real entry path through named AAAAT operations, not a general CRUD, entity browser/query, arbitrary local-ID interface or scraping surface. Purpose-specific capabilities include permitted career context, **AI-visible CV tags and notes for the assistant to judge suitability**, further permitted document content when descriptions are insufficient, bounded contributions and supported local production actions. AAAAT does not rank CV suitability on the assistant's behalf. These capabilities do not grant candidature-history access or generic profile/document browsing.

“Specific RAG + orchestrator” describes AAAAT's role when AI is involved. It does not prescribe a vector database, agent loop, workflow engine or general retrieval platform.

## Accessible setup, ownership and honest limits

One small explicit environment/capability model supports graphical setup and generated `installer.ai` / `configurator.ai` guidance. Detect and reuse working TeX and relevant software; explain installation and validation; support several named AI connections and useful operation defaults based on actual capabilities.

No AI, existing local software, remote services, external hosts and guidance pasted into a free chat are valid configurations. Ordinary use must not assume paid cloud access, API keys, JSON, shell commands or developer expertise. Suggestions become explicit editable configuration, not hidden changes to user data. Copy/paste is a useful fallback while richer bounded integration remains a real product path.

A tool already granted unrestricted screen, filesystem or shell access lies outside AAAAT's application-level privacy guarantee. Setup must explain the chosen host's actual access, including workspace paths in host configuration, and leave that trust choice to the user.

The authoritative local workspace owns SQLite data, files and artifacts. Backup/recovery and configuration import/export are product requirements. No mandatory cloud service is required.

## Examples that preserve the intent

| Situation | Required freedom |
| --- | --- |
| Raw-only capture | Save a message and later find text beyond its short label, without extraction. |
| Mixed input | Extract with AI, correct manually, add another value and later reuse all as ordinary information. |
| Unexpected call | Find a candidature and use the sources and information the user configured in Focus. |
| Standalone document | Open AAAAT only to write/render a CV or letter, without a candidature or AI. |
| Quick application | Retain a reference, create CV/letter material and preserve the used artifacts without completing unrelated fields. |
| External assistance | Let a chosen assistant use permitted career/CV context and contribute through named operations without browsing candidature history. |
| Different installations | Offer coherent manual use, actual local/remote capabilities or free-chat guidance according to the user's environment. |

## Interpreting corrections and preventing drift

Preserve validated v1 product lessons, not its Python/wx implementation, schema, queues, widget architecture or historical workflows. Conventional industry practice, existing AI-generated code, convenient test sequences and schema symmetry cannot create requirements. An unimplemented or unusual capability does not cease to be required. A dashboard may be useful later; historical v1 plans do not make it core.

Do not turn “optional” into “forbidden”, or “supported” into “mandatory”. Treat owner corrections as evidence of a possible misunderstanding: recover the concern and challenge an unsuitable technical mechanism respectfully. The owner is neither an always-available QA tester nor an infallible technical oracle.

There is no real-user v2 compatibility baseline yet. Obsolete development code, fixtures and schema may be corrected directly; they do not justify migration machinery for nonexistent users. Establish an explicit real-use baseline before making user-data upgrade commitments.

Maintainability by one developer plus AI matters. Prefer the smallest coherent implementation that satisfies these capabilities. Meaningful completions and handoffs start with a brief plain-language state, next destination, required owner attention and evidence before engineering detail.
