# Review Policy

Builder → Reviewer → Integrator.

Reviewer independently challenges Builder assumptions and reports evidence-backed findings. Material corrections invalidate affected review; Integrator selects repeated evidence. Security, privacy, renderer isolation, local ownership, human operation without AI, and portable user-owned output are hard gates where applicable.

Block generic CRUD, entity browsing/listing/search/query, arbitrary durable-ID access, scraping, broad AI/local write access, application-service bypass, arbitrary database/filesystem/shell/process/repository exposure, renderer privilege weakening, disclosure outside configured operation context, silent overwrite where forbidden, mandatory AI, or product drift. A purpose-specific operation may disclose only the CV tags, notes, Sources, or document material its stated purpose permits; that is not generic browsing.

AI output is ordinary bounded input. Do not block solely because AAAAT lacks prompt-injection detection, an AI firewall, generic model-security middleware, cryptographic placeholder machinery, or a universal approval queue.

Search for duplicate mutation paths, unused abstractions, v1 leakage, privacy leaks, TeX portability loss, incidental tests, optional behavior made mandatory, defaults made into workflow, silently deferred owner requirements, and frameworks built around one case.

Outcomes: MERGE when acceptance and gates pass with no blocker, unjustified complexity, undocumented Class C, unresolved meaning, or Class D change; CORRECT for branch fixes; COMMITTEE for unresolved technical evidence; OWNER_DECISION for one concrete unresolved meaning/Class D question.
