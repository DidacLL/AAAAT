# AAAAT Settings, setup, and recovery interaction notes

Status: historical UX and implementation evidence from a completed bounded change. Not product authority or an active work contract.

Use this record only to understand existing secondary administration after product meaning has been established through [`PRODUCT_DEFINITION.md`](../PRODUCT_DEFINITION.md). It is subordinate to the Product Definition and derived [`SPEC.md`](SPEC.md); related interaction notes, [`UX_VISUAL_DIRECTION.md`](UX_VISUAL_DIRECTION.md), and [`UX_HISTORY_RECONCILIATION.md`](UX_HISTORY_RECONCILIATION.md) do not create requirements.

This record describes secondary administration considered before global shell synthesis. It does not prescribe final global navigation, React components, CSS, pane geometry, provider architecture, persistence design, or environment abstractions.

## 1. Interaction objective

Settings exists to support ordinary work without becoming the product hierarchy.

It groups infrequent administration by user intention:

1. **Workspace** — where my local AAAAT workspace is and how I open/switch it.
2. **Backup and recovery** — how I protect or restore my workspace.
3. **Document rendering** — whether local TeX rendering is available and what to do if not.
4. **AI connections** — which optional external assistance routes are configured.
5. **Portability and external tools** — configuration portability and trust implications for external hosts/tools.

These are Settings intentions, not required top-level product destinations.

## 2. First run

First run has one job: get the user into a usable local workspace with minimal uncertainty.

Required flow:

```text
AAAAT
  ↓
Create local workspace   or   Open existing workspace
  ↓
ordinary product work
```

Restore from backup is discoverable as a secondary path.

First run must state, concisely:

- AAAAT can work without AI;
- workspace data is local/user-owned;
- the user can create/open a workspace now;
- backup restore is available when needed.

Do not require TeX, AI, provider, external-host, profile, candidature, or document setup before workspace entry.

## 3. Workspace administration

Workspace settings answer: **“Which local workspace am I using and how do I change it safely?”**

Useful information includes:

- recognizable workspace name/path/location where appropriate;
- open/switch workspace;
- create another workspace;
- relevant local ownership information;
- access to backup/recovery.

Technical database paths, migration state, SQLite internals, lock files, or repository abstractions are advanced diagnostic detail only when genuinely useful.

## 4. Workspace switching and dirty state

Switching workspace can replace the entire product context and therefore is a dirty boundary.

Before a switch that would discard unsaved work:

- save and continue;
- discard and continue;
- stay.

No confirmation is shown if no unsaved work is at risk.

A failed switch must leave the current authoritative workspace usable whenever possible and explain what failed.

## 5. Backup

Backup answers: **“How do I preserve a recoverable copy of my local workspace?”**

The ordinary interaction should explain:

- what is being backed up at a human level;
- where the backup will be placed or how the destination is chosen;
- whether the operation succeeded;
- the resulting backup location/name.

Do not make users understand database journals, migration versions, hashes, or internal workspace layouts to create a backup.

A backup operation must not silently mutate ordinary candidature/document/profile data.

## 6. Restore / recovery

Restore is explicit and consequential.

A valid flow:

```text
Restore backup
  ↓
choose backup
  ↓
inspect recognizable backup/workspace information
  ↓
warn about affected current workspace state
  ↓
confirm deliberate restore
  ↓
restore or fail safely
```

Required behavior:

- dirty drafts are protected before restore;
- the user understands whether current workspace data will be replaced;
- destructive scope is stated before confirmation;
- failed restore does not pretend success;
- when guarantees exist, failure preserves/restores the prior usable workspace;
- post-restore orientation is clear.

Recovery is discoverable from first run and Settings but is not visually equal to routine create/open actions.

## 7. TeX / document rendering capability

TeX settings answer: **“Can this machine render documents locally, and what do I need to do if it cannot?”**

Required states:

- available/usable;
- unavailable/not detected;
- failed check/error;
- relevant path/environment detail progressively available.

If TeX is unavailable:

- candidature work remains usable;
- professional-information editing remains usable;
- document editing remains usable;
- Render explains the missing capability contextually in VCVGenerator;
- Settings provides setup/diagnostic guidance.

Do not make missing TeX a global application failure.

## 8. TeX detail boundary

Ordinary users need capability status and useful next actions.

Advanced users may inspect relevant executable/path/version/environment details when those details help diagnosis.

Do not expose generic process execution configuration or invent a broad environment-management framework.

## 9. AI connections

AI Settings answers: **“What optional external assistance can AAAAT use?”**

Administration may include:

- configured provider/connection identities;
- connection status where reliably knowable;
- capabilities available through each configured route;
- add/edit/remove connection actions;
- concise privacy/disclosure implications.

Provider setup belongs here. AI actions themselves remain contextual near Sources, candidature information, professional information, CVs, and letters.

No AI connection is required for core product use.

## 10. Capability-oriented connection presentation

Users should understand what a configured connection enables rather than navigating provider internals as product structure.

Settings may show a provider/connection because administration requires it, but ordinary product features should request capabilities/contextual assistance rather than making users choose a provider destination every time.

Do not advertise unavailable/unreliable AI operations merely because backend APIs expose them.

## 11. AI privacy boundary

Settings owns connection-level and global/provider administration.

Object-level disclosure remains contextual:

- a Source controls whether its content may participate where applicable;
- professional information exposes its own disclosure controls;
- candidature information and document content expose relevant disclosure at their own detail/action points.

Settings must not duplicate every object-level privacy toggle into a giant matrix.

## 12. External host/tool trust

External tools may have permissions outside AAAAT’s application boundary.

The advanced/settings explanation must state plainly that an external host/tool with filesystem, screen, shell, or similar broad access may observe information independently of AAAAT’s own object-level AI/privacy controls.

AAAAT must not imply it can sandbox or revoke host-level permissions it does not control.

The UX should distinguish:

- AAAAT application-level disclosure choices;
- provider/connection configuration;
- broader permissions granted directly to an external host/tool by the operating system or user.

This explanation should be available where external-host setup occurs, not repeated as permanent ordinary-product chrome.

## 13. Configuration portability

Where current product semantics support configuration export/import, Settings should present it as deliberate portability/backup of configuration—not workspace content unless that is explicitly what the operation includes.

The user should understand:

- what configuration is included;
- what is not included;
- destination/source;
- success/failure;
- whether importing will replace existing settings.

Do not conflate configuration portability with full workspace backup.

## 14. Settings information architecture

Do not create one giant form.

A valid Settings composition groups by infrequent user intention, for example:

```text
Settings
  Workspace
  Backup & recovery
  Document rendering
  AI connections
  Portability & external tools
```

Exact labels and widgets are not frozen.

Each group should expose a concise status/summary first and deeper controls on deliberate entry.

## 15. Contextual handoffs into Settings

Ordinary work may link into the relevant Settings subsection when an optional capability is unavailable.

Examples:

- Render → “Document rendering is unavailable” → relevant TeX setup section.
- AI action → “No suitable AI connection” → AI connections.
- workspace/recovery action → backup/recovery section.

The return path should restore the user’s prior product context when practical.

Do not force users to navigate through generic Settings home and reconstruct where they came from.

## 16. First-run versus Settings

First run is not a full Settings wizard.

First-run content should include only what is needed to establish/open/restore a workspace and basic trust expectations.

After entry:

- TeX setup appears when rendering becomes relevant;
- AI setup appears when assistance becomes relevant;
- external-host configuration appears when the user deliberately chooses such integration;
- backup/recovery remains discoverable but secondary.

## 17. Error semantics

Settings errors must describe the affected administration action and authoritative consequences.

Examples:

- backup failed: current workspace remains unchanged;
- restore failed: state of prior workspace is explained according to the operation guarantee;
- TeX check failed: document editing remains available;
- AI connection check failed: manual product operation remains available;
- configuration import failed: whether prior settings were preserved is stated.

Raw stack traces, IPC errors, database errors, or protocol payloads are advanced diagnostics only.

## 18. Loading and capability checks

Settings must not block the whole application while checking one optional capability.

Use scoped loading states:

- checking TeX capability;
- checking an AI connection;
- reading backup metadata;
- validating an import.

Other Settings sections and ordinary product work remain oriented/usable when technically possible.

## 19. Destructive actions

Destructive or broad-scope actions require clear boundaries, including:

- restore replacing current workspace data;
- removing a configured connection;
- replacing imported configuration;
- switching workspace with unsaved drafts.

Confirm only meaningful consequences. Do not create routine confirmation noise for harmless navigation or read-only checks.

## 20. Default desktop composition

A desktop Settings composition may use a local Settings index and one selected administration surface.

```text
┌──────────────────────────────────────────────────────────────┐
│ Settings                                                     │
├──────────────────────┬───────────────────────────────────────┤
│ Workspace            │ selected settings summary/detail      │
│ Backup & recovery    │                                       │
│ Document rendering   │ status first                          │
│ AI connections       │ deeper controls on demand             │
│ Portability/tools    │                                       │
└──────────────────────┴───────────────────────────────────────┘
```

This is hierarchy only, not a mandated sidebar.

## 21. Minimum `720×600` behavior

At minimum size, Settings index and selected section may transition rather than share narrow columns.

Required properties:

- one principal administration task at a time;
- vertical scrolling instead of clipping;
- long paths/technical values wrap or use deliberate detail affordances;
- destructive confirmations fit without obscuring consequence text/actions;
- return-to-context control remains reachable for contextual handoffs;
- fixed chrome does not make restore/setup controls unreachable.

## 22. Representative states

### No workspace yet

Create/open workspace is primary; restore is secondary. AI/TeX setup is not required.

### Backup never created

Explain what backup protects and offer Create backup. Do not label the workspace unsafe/broken.

### TeX unavailable

Show “Document rendering unavailable” with setup/help. State that editing and other work still function.

### No AI connections

Explain that AI help is optional. Offer Add connection without presenting manual use as degraded.

### External host not configured

No warning banner is needed during ordinary work. Explain trust implications when the user enters external-host setup.

### Failed capability check

Differentiate “not configured/unavailable” from “check failed”. Preserve manual operation.

## 23. Anti-patterns

Stage-4 implementation must not drift into:

1. one giant miscellaneous Settings form;
2. first-run AI/TeX/provider setup ceremony;
3. Settings as a primary work destination;
4. provider-specific product navigation;
5. duplicate object-level privacy matrices;
6. claiming AAAAT controls external host permissions it does not control;
7. generic environment/plugin/framework architecture;
8. raw implementation diagnostics in ordinary UI;
9. recovery hidden so deeply it is undiscoverable;
10. restore without clear destructive scope;
11. optional capability failure making the whole product look broken;
12. minimum-size clipping;
13. silent draft loss on workspace/recovery transitions.

## 24. Acceptance mapping

The interaction is acceptable only if:

- first run reaches a usable local workspace without AI/TeX setup;
- restore is discoverable but secondary;
- backup/restore consequences are understandable;
- dirty state is protected before workspace/recovery changes;
- missing TeX affects render capability, not document existence/editing;
- missing AI affects contextual assistance only;
- provider administration is secondary Settings work;
- external-host trust boundaries are honest;
- object privacy controls remain contextual while Settings owns connection/global administration;
- configuration portability is distinct from workspace backup;
- Settings uses intention-based groups rather than one giant form;
- `720×600` remains usable;
- Stage 5 global shell/navigation remains undecided here.

## 25. Deliberately open for Stage 5

Stage 4 does not decide:

- exact global destination set/order;
- global navigation widget;
- whether Settings is a menu, destination, command, or other conventional shell element;
- final ordinary-user name of VCVGenerator/professional information destinations;
- final shell treatment of candidature context transitions;
- exact responsive global shell.

Those decisions require synthesis of Stages 1–4 together.
