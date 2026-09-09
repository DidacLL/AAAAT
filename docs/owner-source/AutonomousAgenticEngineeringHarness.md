## Autonomous Agentic Engineering Harness

### 1. Principle

AAAAT will be developed primarily by multi-agent AI engineering teams under a **provider-agnostic autonomous engineering harness**.

The owner is not expected to supervise normal implementation decisions.

The harness must allow teams using different models, vendors, coding agents or orchestration systems to reach substantially the same engineering decisions from the repository itself.

The development model is:

```text
SPEC
  ↓
current Mission
  ↓
agentic harness
  ↓
autonomous task decomposition
  ↓
implementation
  ↓
independent review
  ↓
tests / evidence
  ↓
merge
```

The repository, not a particular AI provider, is the source of coordination.

---

### 2. Avoid planning the entire project as work packages

AAAAT must **not pre-create dozens of detailed work packages**.

That encourages:

- speculative architecture;
- fake dependencies;
- agents implementing scaffolding because a future package mentions it;
- excessive documentation maintenance;
- architecture becoming optimized for the plan instead of the product.

Only the next useful capability should be decomposed in detail.

The project therefore uses a small number of **Capability Missions**.

Initial missions are:

```text
M0 — Foundation
M1 — Manual VCVGenerator
M2 — Candidature Workspace
M3 — AI Assistance
M4 — External AI + Setup + Portability
M5 — Release Hardening
```

These are product checkpoints, not implementation phases.

A Mission may internally require several tasks, but those tasks are created dynamically by the agentic team when the Mission starts.

There is no required predefined number of tasks.

---

### 3. Mission rule

Every Mission must answer one question:

> **What useful capability exists after this Mission that did not exist before?**

Examples:

**M1**

```text
AAAAT can maintain career data
and create/edit/export portable CVs and cover letters.
```

**M2**

```text
AAAAT can track and retrieve real candidatures
and associate them with career documents.
```

**M3**

```text
AAAAT can use configured AI directly
without making manual workflows dependent on it.
```

If a proposed Mission cannot be described as a useful product outcome, it is probably architecture work disguised as progress.

---

## Provider-Agnostic Repository Harness

### 4. Harness layout

The repository should contain approximately:

```text
AGENTS.md

docs/
  SPEC.md
  adr/

.agentic/
  CONSTITUTION.md
  CURRENT_MISSION.md
  DECISION_POLICY.md
  REVIEW_POLICY.md
  STATE.json
```

No provider-specific assumptions belong in this structure.

There should not be separate authoritative instructions for:

```text
Codex
Claude
Gemini
Copilot
Cursor
OpenHands
other coding agents
```

Provider-specific convenience files may point to the harness, but they must not redefine it.

---

### 5. `AGENTS.md`

`AGENTS.md` is deliberately short.

Its function is to bootstrap any development agent:

```text
1. Read docs/SPEC.md.
2. Read .agentic/CONSTITUTION.md.
3. Read .agentic/CURRENT_MISSION.md.
4. Read relevant ADRs.
5. Inspect .agentic/STATE.json.
6. Do not implement speculative future capability.
7. Run repository verification before declaring completion.
```

It should not duplicate the full architecture.

---

### 6. `CONSTITUTION.md`

This contains only the rules agents must almost never reinterpret.

For AAAAT these include:

```text
local-first authoritative data

manual operation independent from AI

portable standard LaTeX output

pdfLaTeX compatibility baseline

standard LaTeX + expl3 implementation

single application-service mutation path

sandboxed Electron renderer

no v1 compatibility obligation

no general agent framework

no workflow engine

no generic plugin platform

no cloud backend requirement

AI returns validated proposals, not arbitrary authority

external AI uses bounded AAAAT capabilities

prefer fewer abstractions

build today's requirement, not hypothetical futures
```

This file should fit in a few pages.

If it becomes a second SPEC, it has failed.

---

### 7. `CURRENT_MISSION.md`

Only **one primary Mission** is active.

Example:

```markdown
# M1 — Manual VCVGenerator

## Outcome

A user can maintain a professional profile and create,
render and export a portable CV and cover letter.

## Required behavior

- canonical professional data
- named profile variants
- manual document editing
- CV generation
- cover-letter generation
- portable LaTeX
- pdfLaTeX baseline
- LuaLaTeX/XeLaTeX compatibility where supported

## Explicit non-goals

- AI generation
- candidature tracking
- MCP
- plugin system
- generalized template marketplace

## Completion evidence

Defined by executable acceptance tests and one
end-to-end user journey.
```

The Mission describes outcomes and boundaries.

It does **not** prescribe every class/file/task.

---

### 8. Dynamic task decomposition

At the beginning of a Mission, an orchestration agent constructs the **minimum task graph needed for the Mission**.

Example:

```text
M1 Manual VCVGenerator

profile persistence ───────┐
                           ├─ profile variants
portable TeX proof ────────┤
                           ├─ document editing
                           └─ end-to-end CV/letter flow
```

Tasks may be parallelized when their contracts are already clear.

The task graph is allowed to change as evidence appears.

Tasks are implementation coordination objects, not permanent architectural commitments.

Do not create fifty future task files before they are needed.

---

## Autonomous Team Structure

### 9. Default team

For a normal task, use three logical roles:

```text
Builder
Reviewer
Integrator
```

They may be implemented by different models or multiple independent instances of the same model.

#### Builder

Produces the implementation and relevant tests.

#### Reviewer

Receives the requirement and resulting changes independently.

Its objective is to find:

```text
incorrect behavior
scope drift
security issues
missing edge cases
unnecessary abstractions
spec violations
```

#### Integrator

Evaluates:

```text
Builder result
Reviewer findings
tests
existing contracts
Mission boundary
```

and decides whether to:

```text
accept
request correction
split remaining work
invoke expert committee
```

Normal development should not require owner intervention.

---

### 10. Expert committee

When normal Builder/Reviewer resolution is insufficient, the harness may instantiate a temporary **Committee of Experts**.

The committee is dynamically selected according to the problem.

Possible roles:

```text
software architect
security engineer
desktop/Electron specialist
database specialist
LaTeX specialist
AI integration specialist
UX/product specialist
testing/reliability specialist
skeptical simplifier
```

Not every decision requires every role.

Typical committee:

```text
3 independent experts
+
1 arbiter
```

The experts should reason independently before seeing each other's conclusions where the orchestration system permits it.

This reduces model anchoring and consensus-by-imitation.

---

### 11. Committee protocol

For a disputed decision, the harness provides each expert:

```text
problem
relevant SPEC section
Mission boundary
existing contracts
constraints
observed evidence
```

Each returns:

```text
recommendation
reasoning summary
risks
complexity introduced
reversibility
tests/evidence required
```

The arbiter evaluates the proposals against the project's fixed priorities:

```text
1. correctness
2. user/product requirement
3. simplicity
4. maintainability by one engineer
5. portability
6. security/privacy
7. testability
8. ecosystem convention
9. speculative future flexibility
```

Notice that **future flexibility ranks last**.

---

## Autonomous Decision Policy

### 12. Decision classes

Not every uncertainty should reach the owner.

#### Class A — Implementation detail

Examples:

```text
function naming
component decomposition
SQL query form
test fixture organization
small library use
```

Builder + Reviewer resolve autonomously.

No ADR.

---

#### Class B — Local design decision

Examples:

```text
two reasonable component APIs
where a bounded validation helper belongs
specific UX interaction within approved behavior
```

Integrator resolves.

If disagreement remains, use a small expert committee.

No owner involvement.

---

#### Class C — Architectural but bounded/reversible

Examples:

```text
introduce a small new runtime dependency
split a module at a demonstrated boundary
modify a shared internal contract
choose between two equivalent persistence representations
```

Expert committee required.

If approved, automatically create an ADR.

Human approval is not normally required.

---

#### Class D — Constitutional change

Only these should normally reach the owner.

Examples:

```text
replace Electron

replace SQLite

introduce mandatory cloud infrastructure

make AI mandatory

drop local ownership

drop portable LaTeX

drop pdfLaTeX baseline

weaken renderer sandboxing

introduce general plugin/workflow/agent platform

change fundamental canonical-profile semantics

send previously-local private data remotely by default
```

These alter what AAAAT fundamentally is.

The agentic team may prepare:

```text
problem
evidence
committee recommendation
alternatives
ADR proposal
```

but does not silently redefine the product.

Class D events should be rare.

---

## Anti-Overengineering Governor

### 13. Default answer is “do less”

Before adding architecture, agents must ask:

```text
Can the current Mission succeed without this?
```

If yes, do not add it.

---

### 14. Three-strike abstraction rule

A generalized abstraction should normally appear only after evidence from actual code.

Default heuristic:

```text
first case
→ implement clearly

second similar case
→ tolerate small duplication or extract obvious common function

third real case
→ consider generalized abstraction
```

This is a heuristic, not a mathematical law.

Security/process boundaries may justify earlier abstraction.

“Provider architecture may need this someday” does not.

---

### 15. Infrastructure budget

Every Mission receives an implicit infrastructure budget:

> **Infrastructure must be materially smaller than the product behavior it enables.**

A Mission intended to implement:

```text
Render a CV
```

must not result in:

```text
template framework
plugin registry
rendering engine abstraction hierarchy
generic workflow scheduler
extension marketplace
```

unless independently proven necessary.

The Reviewer must reject disproportionate infrastructure.

---

### 16. Deletion is a valid resolution

Agents are explicitly authorized to remove speculative code.

When an implementation introduces:

```text
unused interface
unused factory
unused registry
unused generic adapter
unused extension point
```

the Reviewer should prefer deletion over documenting a hypothetical future purpose.

---

### 17. Complexity challenge

Before merging any new framework, subsystem or major abstraction, a **Skeptical Simplifier** role must answer:

> Can the requirement be implemented more directly with the existing architecture?

If yes, the simpler implementation wins unless measurable evidence favors the larger design.

---

### 18. No architecture by analogy

Agents must not justify complexity with statements such as:

```text
enterprise projects normally...
clean architecture says...
this might scale better...
most SaaS systems...
we may later support...
```

AAAAT is:

```text
one local desktop application
maintained by one engineer
assisted by autonomous AI teams
```

Architectural decisions must solve AAAAT's actual constraints.

---

## Autonomous Verification

### 19. Tests are executable arbitration

Where possible, disagreements should be converted into tests.

Examples:

```text
Will exported LaTeX work outside AAAAT?
→ copy it elsewhere and compile it.

Will malformed AI overwrite data?
→ inject malformed response and assert no mutation.

Can manual operation survive AI failure?
→ disable provider and execute workflow.

Does profile variation duplicate canonical data?
→ mutate canonical item and test inherited resolution.
```

Executable evidence outranks agent opinion.

---

### 20. Definition of autonomous completion

A team may merge without owner involvement when:

```text
Mission requirement is satisfied

Builder reports completion

Reviewer finds no unresolved blocking issue

Integrator accepts the result

all relevant automated checks pass

manual-equivalent workflow is covered where automation permits

no Class D decision was introduced

no speculative architecture remains

STATE.json is updated
```

---

### 21. `STATE.json`

Maintain small machine-readable project state.

Example:

```json
{
  "schemaVersion": 1,
  "currentMission": "M1",
  "completedMissions": ["M0"],
  "activeTasks": [
    "profile-storage",
    "portable-cv"
  ],
  "ownedContracts": {
    "profile-schema": "profile-storage",
    "latex-template-contract": "portable-cv"
  },
  "blocked": [],
  "pendingAdr": []
}
```

This exists for autonomous coordination.

It must not evolve into a project-management database.

If the file becomes difficult to understand manually, simplify it.

---

## Revised Capability Missions

### 22. M0 — Foundation

Prove only:

```text
Electron security boundary
React renderer
TypeScript contracts
SQLite
build/package/test pipeline
```

Then stop building infrastructure.

---

### 23. M1 — Manual VCVGenerator

Deliver the primary reason AAAAT v2 was restarted:

```text
career profile
named variants
CV
cover letter
combined output
editable document content
standard LaTeX/expl3
pdfLaTeX baseline
portable exported project
local rendering
```

Use it personally before continuing.

---

### 24. M2 — Candidature Workspace

Deliver:

```text
candidature tracking
job-source storage
search
status
notes
concepts
recruiter focus
document association
```

No AI required.

Use it personally before automating it.

---

### 25. M3 — AI Assistance

Deliver:

```text
generic OpenAI-compatible provider
Ollama/LM Studio convenience
privacy projection
job extraction
profile recommendation
CV tailoring
cover-letter drafting
```

AI enhances already-working manual operations.

---

### 26. M4 — Agentic Interoperability and Setup

Deliver only the integration mechanisms justified by actual systems being tested:

```text
bounded external command surface
official MCP integration
provider-agnostic integration harness
adaptive bridge bootstrap
shared installer recipe model
installer.ai
backup/restore
```

The external-AI harness may help create host-specific:

```text
skills
apps
plugins
MCP configs
wrappers
```

without creating an AAAAT plugin platform.

---

### 27. M5 — Release Hardening

No architectural expansion.

Only:

```text
real platform packaging
reliability
security
recovery
documentation
compatibility evidence
cleanup
```

---

## Final Agentic Governance Rule

AAAAT's autonomous development system exists to **reduce owner supervision**, not to create another software product inside AAAAT.

The harness itself must remain simpler than the application.

Its job is only to guarantee that arbitrary competent development agents can determine:

```text
what AAAAT is

what we are currently building

what they are allowed to change

how disagreements are resolved

how their result is verified

when architecture is protected from speculative expansion
```

The preferred autonomous development loop is therefore:

```text
Mission
  ↓
minimal task decomposition
  ↓
Builder
  ↓
Reviewer
  ↓
tests
  ↓
Integrator
  │
  ├─ clear → merge
  │
  └─ disputed
       ↓
   expert committee
       ↓
   evidence-based arbitration
       │
       ├─ Class A/B/C → autonomous resolution
       └─ Class D → owner decision
```

The owner should ordinarily interact with **product outcomes and rare constitutional decisions**, not routine agent coordination.

The most important governor is:

> **If the autonomous system starts spending more effort designing its own orchestration than delivering the current AAAAT Mission, it is overengineered and must be simplified.**