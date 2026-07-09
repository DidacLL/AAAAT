# Dashboard Requirements Trace

## Status

Recommendation: `ACCEPT_PLAN`

This trace validates the dashboard planning pack against the product owner dashboard intent, the four-view model, and the compatibility amendment requiring a dashboard projection/view-model boundary.

The plan is acceptable for implementation agents to proceed, provided they keep the dashboard work scoped to the human-local dashboard runtime and do not expand the agent-facing contract.

## Intended dashboard view model

AAAAT should preserve four human-facing dashboard views:

- **Welcome View**: first-run, onboarding, empty-state, and orientation view. It gives short local-first orientation and clean entry actions without showing the full operational dashboard or noisy forms by default.
- **User View**: profile, career strategy, template, settings, CV fields, writing preferences, and local storage/privacy control center. It is separate from candidature operations and groups forms inside expandable panels.
- **Smart View**: default operational recruiter-call view. It starts with a compact candidature list, then keeps the selected candidature visible while showing central operational detail and a right-side context selector for notes, keywords, artifacts, call card, company research, form answers, and agent suggestions.
- **Detailed View**: table/grid candidature management view. It shows candidatures as rows, makes core fields available as columns, supports column visibility/order/search/filter state where practical, and provides a toolbox plus a human-facing LLM task queue.

Smart View and Detailed View do **not** replace Welcome View and User View. They complete the four-view dashboard model.

## Explicit confirmations

- Smart View and Detailed View do not replace Welcome View and User View.
- Notes are one primary always-editable note field per candidature in full local mode, not a primary list-of-notes interaction. Historical note lists or provenance may exist later, but they must not be the main note-taking interaction.
- Forms are hidden by default in expandable panels. This applies to creation, import, raw intake, profile, career strategy, template variables, CV fields, and advanced configuration forms.
- Dashboard UX work applies only to the human-local dashboard runtime and must not become an agent-facing API.
- The dashboard should render from structured projection/view-model data where practical instead of assembling all state only inside HTML templates.
- The projection layer is not an agent API, provider integration, host adapter, broad HTTP contract, or CRUD surface.
- Dashboard projection/view-model work may prepare future UI adapter compatibility, but the current branch should only prepare the internal dashboard boundary needed for the redesign.
- Current branch scope does not include implementing a compatibility descriptor, host adapter, provider integration, broad privacy overhaul, artifact lifecycle overhaul, or storage/domain rewrite unless already required by existing code.

## Requirements trace table

| Requirement | Source planning file | Expected implementation area | Test expectation | Risk if missed |
| --- | --- | --- | --- | --- |
| Preserve four human-facing views: Welcome, User, Smart, Detailed | `README.md`; `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md` | Dashboard route/view selection, templates, projection/view-state model | Tests prove all four views exist or are preserved | Dashboard collapses into only operational views and loses onboarding/profile control center |
| Smart/Detailed do not replace Welcome/User | `README.md`; `01-dashboard-requirements-review.md`; `04-codex-worker-prompts.md` | Navigation model, templates, implementation sequencing | Tests or review checks verify Welcome/User remain reachable after Smart/Detailed work | User loses first-run orientation and profile/settings workspace |
| Welcome View is short orientation and setup entry point | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Welcome projection, template section, first-run/empty-state routing | Welcome renders for first-run/empty-state and exposes primary setup actions | New users see noisy dashboard state before setup and lose clear onboarding |
| Welcome setup forms hidden by default | `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Expandable panels, template defaults, minimal JS/panel state | Welcome does not expose noisy raw/setup forms by default | Dashboard starts as form clutter rather than orientation |
| User View is profile/career/template/settings control center | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | User projection, profile/settings template groups | User View renders profile/career/template/settings sections | Profile and strategy editing are mixed into candidature operations |
| User View forms grouped in expandable panels | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Expandable panel components, User View projection expanded state | User View groups forms and does not show operational clutter by default | Profile/settings view becomes visually noisy and hard to scan |
| Smart View is default operational recruiter-call view after setup | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | View-state defaults, Smart View projection, dashboard template | Smart View renders as default operational view after setup | Dashboard fails its main fast-call use case |
| Smart View starts with left candidature list expanded | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Smart View layout/panel state | Test verifies left candidature panel starts expanded | User cannot identify caller/application quickly |
| Smart View list uses compact identifying fields | `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Candidature summary projection and list/card template | Test verifies compact fields and avoids long detail fields in primary list | Operational view becomes slow to scan |
| Selected candidature remains visible while context modules change | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Smart View selection state, right-panel module state | Test verifies selected candidature persists when switching modules | User loses orientation during recruiter calls |
| Right panel context modules include notes, keywords, artifacts, call card, company research, form answers, agent suggestions | `02-dashboard-four-view-ux-spec.md`; `04-codex-worker-prompts.md`; `05-dashboard-test-plan.md` | Smart View right panel projection and template | Test verifies module availability | Useful context is buried or scattered |
| Keyword chips update glossary context without losing selected candidature | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Keyword chip rendering, selected keyword state, glossary projection | Test verifies selected keyword definition appears and candidature remains visible | Keyword workflow breaks the call-assistance flow |
| Notes are one primary note field per candidature | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Candidature note field or projection, Smart View notes module, storage bridge if needed | Test verifies one primary note state per selected candidature | Notes remain archive/list widgets and are too slow during calls |
| Primary note is directly editable in full local mode | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Full-mode permissions, note editor/action | Test verifies full local mode allows primary note editing | User cannot capture fast call notes |
| Primary note visible but not editable in read-only mode | `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Read-only permissions, note template state | Test verifies note visibility and disabled/absent edit controls | Read-only call review either hides useful notes or allows accidental edits |
| Static demo never exposes real private notes | `02-dashboard-four-view-ux-spec.md`; `05-dashboard-test-plan.md` | Static demo payload, projection permissions | Test verifies fake-only note content and no write controls | Private data could leak into public demo |
| Avoid duplicated read/edit boxes | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `04-codex-worker-prompts.md` | Templates, inline edit affordances, mode permissions | Review/test verifies data is displayed once and edited inline where supported | UI remains cluttered and confusing |
| Input forms hidden by default in expandable panels | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `04-codex-worker-prompts.md`; `05-dashboard-test-plan.md` | Form components, panel state, templates | Mode/view tests verify raw/create/profile/config forms are collapsed by default | Forms dominate the dashboard and obscure useful state |
| Detailed View is table/grid oriented, not a single-candidature detail page | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Detailed View projection rows/columns, table template | Test verifies candidatures are rows and Detailed View is not a single-detail page | Detailed View duplicates Smart View and cannot support management workflows |
| Detailed View makes core fields available as columns | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Detailed projection available/visible columns | Test verifies core fields are available as columns | User cannot inspect or manage all candidature data efficiently |
| Detailed View supports column visibility/order/search/filter state where practical | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | View-state model, projection, minimal JS if needed | Tests verify visibility/order/search/filter state semantics without brittle CSS | Future user-defined views become hard to add cleanly |
| Detailed View left panel acts as toolbox | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Detailed toolbox projection based on selected row state | Test verifies general vs candidature-specific toolbox actions | Actions are misplaced or always shown without context |
| Detailed View right panel shows human-facing LLM task queue | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Detailed task queue summary projection and template | Test verifies task queue groups where represented and stays human-facing | Agent/task state becomes either invisible to user or confused with agent API |
| Dashboard projection/view-model boundary exists where practical | `README.md`; `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md`; `06-runtime-boundary-notes.md` | Internal projection builders or view-model functions, dashboard payload shape | Test verifies projection can be built without rendering HTML templates | State remains template-only and difficult to test or adapt |
| Projection includes mode permissions | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Projection permissions for full/read-only/static-demo | Tests verify correct permissions in each mode | Write controls leak into read-only/static demo or disappear in full mode |
| Projection is not exposed as broad agent API | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md`; `06-runtime-boundary-notes.md` | Agent runtime route set, docs, tests | Runtime-boundary tests verify agent app has no broad dashboard payload/projection route | Agent receives dashboard data or mutation authority outside bounded contract |
| Dashboard UX work applies only to human-local dashboard runtime | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `06-runtime-boundary-notes.md` | Dashboard app/templates/actions only; no agent app expansion | Tests verify dashboard app renders UI/actions and agent app does not mount them | UX changes accidentally become machine contract |
| Agent runtime remains bounded task/context/action only | `06-runtime-boundary-notes.md`; nearby docs `docs/agent-guide.md`, `docs/security-model.md`, `docs/openapi.md`, `docs/mcp.md` | Agent app constructor/routes, CLI/MCP descriptor docs | Tests verify no dashboard HTML/assets/actions and no broad CRUD/list/search | Architecture regresses into broad agent CRUD over private data |
| Read-only mode preserves visibility and blocks editing | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | Mode permissions, form/action guards, templates | Tests verify data visible and write controls disabled/absent | Recruiter-call review mode may allow accidental mutation |
| Static demo uses fake data and excludes write/raw-intake controls | `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md`; product docs | Static demo projection/payload/export | Tests verify fake data only and no write/raw-intake controls | Private data leak or demo misrepresents runtime |
| Use existing assets and accessible light/dark themes | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md`; `05-dashboard-test-plan.md` | CSS/assets/templates/theme state | Tests/checks verify light/dark theme where represented and durable accessibility markers | Visual redesign becomes inconsistent, unreadable, or inaccessible |
| Avoid heavy frontend dependencies | `01-dashboard-requirements-review.md`; `02-dashboard-four-view-ux-spec.md`; `03-dashboard-implementation-plan.md` | Frontend implementation choices, dependency policy | Review verifies server-rendered/minimal JS remains sufficient | MVP over-engineers frontend and violates project dependency policy |

## Current branch scope versus future work

Current branch may:

- Prepare or implement the internal dashboard projection/view-model boundary required for the four-view redesign.
- Refactor dashboard payload/view-state assembly so templates consume structured state.
- Update server-rendered templates, dashboard mode permissions, minimal JavaScript, and contract-oriented tests.
- Add or adapt a primary-note projection/field if required by existing note storage.

Current branch must not implement unless already required by existing code:

- Provider-neutral compatibility descriptor.
- Host adapter or embedded-host prototype.
- Provider integration or LLM runtime integration.
- Broad privacy/exposure overhaul.
- Artifact lifecycle overhaul.
- Storage adapter redesign.
- Broad domain-service rewrite.
- Broad agent CRUD, list/search, dashboard payload API, or projection API.

Future work may consider compatibility descriptors, host-embedded UI adapters, broader privacy consolidation, artifact lifecycle hardening, and alternate adapters after the dashboard base view model is stable.

## Contradictions, ambiguities, and missing requirements

### Blocking contradictions

None found.

### Resolved historical differences

- `docs/PO/BasicAppRequirements.md` records `Notes[]` as an original field shape, but the current planning pack explicitly supersedes the primary interaction: the dashboard must expose one primary note field per candidature, directly editable in full local mode. Historical note lists may remain as storage/provenance later, but they are not the main UX.
- Historical PO text described `userView` as starting as a copy of `detailedView`. The current planning pack clarifies User View as a dedicated profile/career/template/settings control center. This is acceptable because it preserves User View while removing operational candidature clutter.
- Historical PO text says Detailed View makes complete fields accessible and shown. The planning pack refines this into a table/grid where all core fields are available as columns, but not necessarily visible at once by default. This is acceptable and better aligned with the clean-dashboard requirement.

### Minor ambiguities / implementation notes

- The exact persistence model for the primary note is intentionally open. If existing storage keeps note entries as a list, implementation can introduce a primary note field or projection bridge without deleting historical note records.
- The exact mechanism for view state is intentionally open. It may use query parameters, form fields, local storage, minimal JavaScript, or a small server-side state model if existing implementation supports it.
- The exact level of column reordering/filtering/searching for the first implementation is open. Tests should verify durable projection/view-state semantics, not a final advanced grid product.
- User-defined saved views are future work. The current branch should prepare state boundaries but not overbuild saved view persistence.
- The human-facing LLM task queue in Detailed View must remain a dashboard summary, not broad task enumeration authority for agents.

### Missing requirements

No blocking missing requirements found in the planning pack. The current planning files contain the required four-view model, note behavior, expandable-form policy, runtime boundary language, projection/view-model amendment, mode restrictions, and testing direction.

The next companion audit file, `08-current-dashboard-implementation-map.md`, should map current implementation files and identify the minimal code locations for the projection layer, view templates, mode guards, and tests.

## Final recommendation

`ACCEPT_PLAN`

Implementation agents can proceed to the current-dashboard implementation map and then to projection/view-model work. They should keep changes small, server-rendered, local-first, and dashboard-only, with no new agent-facing dashboard API or provider-specific integration.
