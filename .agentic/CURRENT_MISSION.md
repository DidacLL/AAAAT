# Current mission — v2 refinement, deployment blocked

Current explicit Product Owner instructions remain highest authority. These defects block v2; they are not deferred to v2.1. Earlier PLAN completion claims do not establish product acceptance.

The working branch is `agentic/428-clean-restart`, based on `4c7fa319ba12cf3524320de076a045c3330f7a29`. That commit supplies the underlying working implementation, not an approved visual design. The Product Owner rejected the integrated frontend in draft PR #433 (`agentic/428-v2-integrated`); do not use it as the design or implementation source. Investigate useful backend corrections against owner authority and implement them afresh. The Product Owner has instructed that no further specialists be used.

The original requirements govern the whole application: frictionless ordinary use, full user control, legible typographic prominence, productive use of wide screens, fixed top bar and left rail without scrollbars, short contextual top-bar actions, and direct per-field controls. Collapsed application cards are minimal covers; expansion occupies roughly twice the current collapsed width and height and reveals useful additional information. Interview assistance remains secondary, editable, and attached to its application context.

The Product Owner accepted the running application-cover design as the good direction on 13 October 2026. Preserve its content-driven flex composition, distinct typographic prominence, neutral paper surfaces, anchored expansion and contextual Tags console. The lasting visual guidance is in docs/UX_VISUAL_DIRECTION.md. Do not replace this direction with equal field boxes, random colour skins, fixed empty card heights or another flat redesign.

The rewrite remains partial. Running-renderer inspection covers the accepted application-card direction, Tag meaning retrieval, unified source-and-fields creation, provisional document Save/Cancel, distinct names and ordinary draft retention. Static typecheck/lint are hygiene only; no new or rewritten automated tests are authorized. AI processing has not been exercised against a real model during this refinement.

Next: preserve unsaved application edits when creating another application, then finish application-scoped editable AI task/context handling and document result/edit protection. Saved-information filling, Tag assistance, My information, Settings, Home and portable document work still need coherent boundary review and affected running-product evidence. The permission guard and removal of development migration routines are implemented afresh, not product acceptance by themselves.

Development workspaces are disposable. Preserve sound local ownership, typed mutation boundaries, renderer isolation, optional AI, and portable document capabilities; do not introduce migration or compatibility machinery. Deployment remains blocked until the complete running product satisfies the original owner requirements.
