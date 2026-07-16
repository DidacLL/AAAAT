# Requirements source policy

Status: active for AAAAT v1.

The only product authority is `v1-authoritative-requirements.md`, plus direct maintainer instruction.

`docs/planning/v1-release-requirement-gap-ledger.md` records implementation gaps against that authority. It does not redefine the product.

Historical prompts, PO annexes, abandoned plans, old PR descriptions, generated summaries, release scripts, README text, source comments, tests, and previous CI results are not requirements.

They must not preserve or reintroduce superseded concepts such as split task/context retrieval, browser-dashboard product modes, the retired browser companion, manual/portable-first assisted setup, AAAAT-managed generated connector installation, provider catalogues, plural candidature notes, invented CRM fields, task clutter in Smart View, Smart View panels in Detailed View, internal-ID user workflows, or word-search privacy gates.

When any supporting source conflicts with the authority, update or remove that source and implement the authoritative behavior. Do not add compatibility code merely to satisfy the conflicting source.
