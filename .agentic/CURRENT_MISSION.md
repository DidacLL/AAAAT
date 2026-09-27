# Current mission — PLAN[4] minimal block-based document package

Current explicit Product Owner instruction remains highest authority.

Base main: `4390fe1a36285e07e8664baf35700d62796dd233`.

PLAN[0]/[1]/[3] are retained. PLAN[2] is complete. The post-PLAN[2] setup audit found no sequence blocker. PLAN[5] remains blocked until PLAN[4] settles.

## Execution model

The master orchestrator owns sequencing, scope, review, evidence interpretation, PR creation/merge and state propagation.

Normal substantial implementation is done by a GitHub-capable chat specialist working through GitHub only. Do not assume that specialist has a local shell, local checkout, Electron/browser access or the Product Owner available as routine QA. Repository CI is the normal engineering verification surface.

Use scarce local/Codex/manual environment work only when a boundary genuinely cannot be established through repository/CI evidence. The Product Owner is not routine QA or prompt transport beyond starting the bounded specialist chat when required.

## Completed evidence to reuse

- PLAN[2] local-computer external-AI boundary was demonstrated with llama.cpp + Granite.
- PLAN[2] no-local external-AI boundary was demonstrated through PR #330 / #329.
- `Send to my AI`, editable/reusable tasks, clipboard/file carriers, direct candidature entry and reusable host guidance are implemented.
- Rendering infrastructure already exists: typed document state, pdfLaTeX/latexmk execution, portable projects, immutable Rendered CV/letter snapshots and Application packets.
- Do not repeat unrelated real-host/manual acceptance after ordinary changes.

## Current PLAN[4] owner decisions

The Product Owner cannot do the originally planned detailed pair-design now and explicitly authorizes a **minimal working PLAN[4] version** first. Detailed blueprint/customization design remains later PLAN[4] debt.

Fixed direction:

- no in-app LaTeX editor;
- a **Blueprint** is block/layout structure, not a font/theme/style preset;
- LaTeX2e public package API with expl3 internals;
- pdfTeX/pdfLaTeX remains the renderer;
- TypeScript owns generated document data;
- straightforward `babel` language handling; language is not printed as a visible metadata row;
- one generic shipped CV blueprint may take structural inspiration from `DidacLL/AgenticCareerBoost@DidacLL/TeXupdate`: full-width header + bounded rail/main regions + flexible vertical distribution;
- do not copy personal data, banner image, role-specific metadata or hard-coded content from that repository;
- expl3 may provide block/region primitives that grow/fill inside predefined regions as content varies.

Current AAAAT does **not** already provide persistent user-customized blueprint/package management. The current rendering path stages fresh `main.tex`, `data.tex` and `aaaat.sty` for a rendered project. Do not invent a blueprint registry or persistence framework in this first slice merely to simulate a capability that is not present.

## Active bounded slice — Issue #344

Implement one minimal real block-based CV package/blueprint while preserving the existing document domain and rendering infrastructure.

Required shape:

```text
Working CV
→ TypeScript feeder
→ generated data.tex (content)
→ generic main.tex blueprint (block placement)
→ aaaat.sty (LaTeX2e API + expl3 layout implementation)
→ pdfLaTeX
```

Keep the TypeScript feeder content-oriented; do not move visual geometry into a generic TypeScript layout engine.

Preserve immutable snapshots, portable exports, Application packets and cover-letter behavior except for tiny compatibility changes if needed.

Explicitly exclude a LaTeX editor, drag/drop designer, generic block DSL, font/theme system, blueprint marketplace/registry, image/header asset subsystem, PLAN[5] CV-editor redesign, unrelated refactors and new runtime dependencies.

## Cost-aware verification

Avoid repeated real-LaTeX compilation during implementation.

- Branch pushes use ordinary `Verify` (`typecheck + lint + Vitest`).
- The implementation specialist should stabilize the branch and get ordinary Verify green **before any PR exists**.
- The specialist returns branch name/head SHA; it does not open the PR.
- The orchestrator reviews the complete branch diff before PR creation and requests corrections while only ordinary Verify is running.
- Once branch review is clean, the orchestrator opens the PR once. That is the intended candidate-boundary trigger for the expensive real-LaTeX portability workflow.
- Re-run real LaTeX only after an actual failure or a later correction that materially changes the TeX/rendering boundary.
- No Product Owner manual QA is required for this implementation slice.

## Next

Dispatch one GitHub-capable implementation specialist to Issue #344. Review its stable branch before opening a PR. If the branch is coherent and ordinary Verify is green, open the PR once, inspect the single candidate-boundary real-LaTeX result, merge if sound, then classify what PLAN[4] debt remains. Do not claim PLAN[4] complete merely from this first minimal blueprint.