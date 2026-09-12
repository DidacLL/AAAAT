# AAAAT UX Definition

Status: **derived UX reference, not product authority.**

Current explicit Product Owner instruction and `PRODUCT_DEFINITION.md` define product meaning. This document translates that meaning into interaction constraints. Historical Smart View, Detailed View, User View and current renderer structures are evidence only and must not be preserved by default.

## 1. One application, several direct intentions

AAAAT must not force the user through one canonical workflow.

The shell must make these intentions directly reachable without pretending they are sequential stages:

- **Candidatures** — retrieve, capture, inspect and maintain opportunity/application information;
- **CVs & letters** — standalone or candidature-context document work through VCVGenerator;
- **Professional information** — reusable user-owned career material;
- **Settings** — secondary workspace/rendering/AI/integration/backup administration.

Focus, Sources, Tags, reminders, AI and artifacts are capabilities/context inside those areas, not peer global destinations simply because they are persisted concepts.

## 2. Candidatures supports multiple entry intentions

Opening Candidatures must support at least four common intentions without forcing one through another:

1. **Recall quickly** — use Focus to find the right candidature and recover useful context.
2. **Capture** — add whatever raw/new material exists with minimal friction.
3. **Maintain deliberately** — directly open a candidature for complete inspection/editing.
4. **Work on application material** — reach/create relevant CVs, letters and retained application artifacts in candidature context.

No status, priority, next-action or lifecycle maintenance is required to use any of these paths.

## 3. Focus is one two-state retrieval experience

### Corpus Focus

The first Focus state answers:

> Which candidature am I looking for?

Requirements:

- multiple candidatures are recognizable simultaneously;
- screen space is used for recognition, not administration;
- each candidature shows only a small Focus-selected set of fields/signals;
- AAAAT may ship default Focus fields, but the user controls which available fields appear;
- sparse candidatures use whatever retained signal best identifies them rather than looking broken;
- search/filter supports partial memory across meaningful retained information, Sources and Tags/aliases;
- no card needs to expand in place to reveal the selected-candidature experience;
- no reminders, Sources, documents or field-configuration machinery are automatically dumped into each summary.

The exact layout is open. Old Smart View cards/grids/panes are explicitly not reusable design authority.

### Selected-candidature Focus

Selecting a candidature transitions to a screen dominated by that candidature. It answers:

> What do I need to remember right now?

Requirements:

- use the available screen rather than keeping a cramped persistent corpus beside it;
- show the richer subset deliberately configured for Focus;
- keep the composition stable and quickly scannable;
- surface relevant Tags/glossary definitions contextually;
- allow small notes or other selected recall information when the user chose them;
- do not automatically show every Source, document, reminder or stored value;
- keep configuration secondary to reading.

Focus is read-first but **not read-only**. Every displayed editable field needs a lightweight edit affordance. The user must be able to correct or add information during a call without leaving Focus for routine edits.

Provide a deliberate shortcut to complete candidature management for deeper work, but do not present that as the mandatory next step.

## 4. Complete candidature work is directly reachable

The user may open a candidature specifically to manage everything without first entering Focus.

This experience answers:

> What does AAAAT retain about this candidature, and can I change it?

It must provide progressive access to:

- all structured candidature information;
- Sources/raw material in full;
- Tags and their candidature association;
- candidature-linked working CVs/letters and retained artifacts;
- privacy/presentation controls where relevant;
- secondary notes/checkable reminders if used;
- secondary provenance/activity only where it has genuine user value.

Do not turn complete access into one enormous static form. Populated information is primarily readable. Edit/add controls live close to the information. Advanced field-definition/privacy/presentation detail is progressively disclosed.

## 5. Capture is intentionally tiny

The normal capture interaction is conceptually:

```text
New candidature
→ paste/provide whatever exists
→ save
```

Do not require the user to decide whether the material is a recruiter message, job advertisement, URL or another Source type before saving.

A raw-only candidature is already valid. After save, the user may leave, continue editing, request extraction, create documents or do something else. Do not mechanically redirect every capture into Focus.

If a suitable AI route is configured, offer extraction as an optional effort-reduction action using the retained material. Without AI, manual use remains complete.

## 6. Information and field UX

Common shipped fields such as company, role, salary and location are defaults, not permanent ontology.

Normal UI presents **information**, not schema administration.

For ordinary fields:

- populated values are readable;
- editing is local and deliberate;
- missing values may have small Add affordances;
- custom/user-maintained fields remain an intended capability even if full field-definition editing is deferred;
- Focus participation is presentation configuration, separate from storage and AI disclosure;
- AI assistance may be offered only where meaningful and only when a suitable configured route exists.

Advanced field-definition/type/detail should never dominate ordinary candidature work.

## 7. Tags are contextual glossary knowledge

Use **Tags** consistently in UI and domain language.

A Tag can have aliases, a definition and notes. It may be associated with many candidatures.

In selected Focus or deliberate candidature work, relevant Tags should be inspectable without forcing the user into a separate knowledge-management destination. Example: selecting/hovering/opening `Spring Boot` can reveal its stored definition in context.

Global Tag maintenance may exist as secondary/advanced functionality, but Tags are not a separate product area.

## 8. Sources

Sources are retained original inputs.

Requirements:

- Source content remains readable in full when requested;
- long raw text does not dominate Focus by default;
- search can use Source content;
- editing/removal is deliberate and candidature-owned;
- extraction never destroys the Source;
- Source-specific AI actions belong beside the Source or target information, not in an AI workspace.

## 9. Notes and reminders

Small candidature-attached notes/checkable reminders are secondary conveniences only.

They must not create task-management navigation, scheduling, recurrence, lifecycle semantics, automatic next actions or default Focus prominence.

If a user chooses a note/reminder as useful Focus content, it may appear there. Otherwise it stays out of the rapid-recall surface.

## 10. CVs & letters / VCVGenerator

VCVGenerator is a first-class direct journey independent of candidatures.

Normal standalone document work should make clear:

1. what document is being edited;
2. what content/information it uses;
3. what the user can change;
4. what output will be produced;
5. how to render/export/open user-owned source/output.

When entered from a candidature, preserve that context and make the relevant working documents/artifacts easy to reach. Do not create a separate candidature-only document editor or force the user through a generic document warehouse.

Advanced ownership details such as LaTeX project files remain available through progressive disclosure without making normal document editing a developer experience.

## 11. Professional information

The primary mental model is reusable professional information, not profile schema architecture.

Show actual content such as experience, skills, projects, education, identity/contact, languages, links and summaries. Common categories are suggestions/defaults rather than a closed taxonomy.

Saved variations and document-specific differences appear only when the user needs them. A user must be able to create/use a normal CV without first understanding variants or patch semantics.

## 12. AI interaction

There is no primary AI destination.

AI is invoked contextually from the Source, field, candidature, CV or letter being worked on.

A good action communicates:

- what help is being requested;
- what context will be used when relevant;
- what result will be proposed/produced;
- what local information will actually change;
- that the result remains editable.

If no valid route exists, the manual action remains available.

Provider/connection administration belongs in Settings.

## 13. External-AI interaction

External AI/tools may enter AAAAT through bounded capabilities. Their broader work may include research or job discovery outside AAAAT.

The desktop UX should not be redesigned around an agent protocol. It should remain the best private interface for full corpus/candidature/professional-information work.

Settings may explain/connect supported external hosts, but protocol vocabulary should remain secondary/technical.

## 14. Privacy

Keep these independent in the UI:

- stored locally;
- visible in Focus;
- allowed to a particular AI operation.

Do not make privacy controls permanent first-sight clutter. Show them where the decision matters and keep deeper disclosure/audit detail progressively accessible.

## 15. First run and Settings

First run establishes a usable local workspace with minimal uncertainty.

Create/open are primary. Restore is secondary but discoverable. AI and TeX configuration are not prerequisites for basic use.

Settings owns infrequent administration: workspace, backup/restore, rendering/TeX, AI connections, external-tool integration and configuration portability.

Do not expose ports, MCP, IPC, schemas, migrations or provider internals in ordinary product language.

## 16. Constrained desktop space

`720×600` is a real supported minimum, not a screenshot checkbox.

At constrained sizes:

- give the current intention most of the screen;
- transition between corpus and selected-candidature Focus rather than compressing both indefinitely;
- stack/scroll rather than clip;
- preserve readable labels and controls;
- avoid persistent multi-pane dashboards that leave no useful working area.

## 17. Editing safety

Navigation must not silently discard unsaved edits.

Dirty-state protection applies when changing significant context such as candidature, document, profile item or workspace. Routine navigation with no unsaved work must not generate confirmation noise.

Saving in one area must not silently commit or erase another area's draft.

## 18. Terminology

Preferred ordinary terms include:

- Candidature / application;
- Source;
- Tag;
- Focus;
- CV;
- Cover letter;
- professional information;
- note/reminder;
- workspace;
- backup.

Avoid `Concept`, lifecycle, next action, schema, field ID, migration, payload, operation capability, MCP, IPC and similar implementation vocabulary in ordinary UI unless explicitly opened as advanced technical detail.

## 19. Anti-patterns

Do not regress into:

- Focus as a tab/section inside an already-selected candidature;
- corpus reduced to a thin selector beside a permanent detail form;
- expand-in-place Smart View cards as the selected Focus experience;
- showing all values/objects because they technically can participate in Focus;
- hardcoded field ontology disguised as defaults;
- schema-administration-first editing;
- required status/priority/next-action/lifecycle maintenance;
- reminder/task-manager prominence;
- `Concepts` as a parallel product vocabulary for Tags;
- a recruiter-message/URL-specific capture form instead of raw-material-first capture;
- AI as navigation or adviser authority;
- generic document warehouse navigation;
- old desktop/Smart View layouts treated as UX authority;
- current implementation structure treated as a design constraint.

## 20. Design test

For every screen or interaction, ask:

1. What intention brought the user here?
2. What information is necessary now?
3. What action should be cheapest now?
4. What can remain one deliberate step deeper?
5. Does the design still work with sparse data, no AI and constrained desktop space?
6. Is any visible machinery present only because the implementation happens to have an entity/service/table for it?

If the answer to the last question is yes, redesign before implementation.