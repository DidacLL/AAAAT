# Intake and candidature assistance clean rebuild

Baseline: exact PR #37 head `97b2e474d4c609002a4c786f81c60446e3b0be5e`.

## Authority

AAAAT architecture, product requirements, local-first privacy, bounded agent context, deterministic application and existing PR #37 desktop contracts are authoritative.

## Architecture

- Existing Smart and Detailed navigation/projection contracts remain unchanged.
- `task_registry.py` is the single preparation-task catalogue.
- `workspace_config.py` owns transparent local automatic-task, runner-command and instruction-override configuration.
- `intake.py` creates one candidature from one pasted offer and plans configured tasks through existing candidature/task APIs.
- `task_runner.py` sends one bounded agent context to a user-configured external command and uses existing result submission/application functions.
- `assistance.py` exposes candidature-scoped preparation commands/results to the desktop.
- `CandidatureSidebar` is shared by Smart and Detailed views.
- `DesktopTaskWorker` keeps external generation off the wx event thread.

## Default intake

Automatic by default:

- full offer/candidature field and call-preparation analysis;
- company and role research;
- career-path fit evaluation;
- missing keyword definitions after extraction;
- form answers only when form questions are supplied.

CV and cover-letter preparation remain supplementary/configurable actions.

## UI rules

- Assistance and supplementary actions live in the persistent right sidebar in Smart focus and Detailed views.
- Actions are collapsed by default.
- Notes remain in the Smart bottom band.
- Center content remains candidature information, not action controls.
- Right-side content uses vertical scrolling and width-aware wrapping.
- Detailed-to-Smart navigation reuses PR #37 selection/view mechanics.
- Smart cards bind their complete non-interactive surface after construction.
