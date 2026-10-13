# ADR 0025 — Application-scoped editable external requests

Status: accepted bounded round-trip principle, updated for the current v2 request model. Supersedes the historical opportunity-research-only projection.

## Decision

An external request belongs to one application and contains fully editable instructions and context. Opening its editor prepares local material; it does not send a request or allow connected reads. Copy/Export use exactly the visible text, without reconstructing hidden context.

Connected reads are an explicit future-access choice. Editing turns them off while preserving local work. Turning access off cannot recall an earlier disclosure. Ordinary navigation keeps the request draft; a different selected application cannot inherit it.

Application-information returns are locally validated, reviewable proposals. Interview requests are secondary, application-linked and fully editable; AAAAT does not own advice. Retaining returned text is a normal explicit Source mutation. Connected interview results carry the original request reference so a late response cannot be saved to the wrong application.

External callers do not gain generic corpus browsing, arbitrary durable mutation handles, filesystem, database or shell authority. The host's wider OS permissions remain a separate user trust choice.

## Consequences

Different useful requests can carry different context without hardcoded global field allowlists or a generic task/policy framework. Local ownership and understandable operations define the boundary; MCP, files and clipboard are carriers. A carrier implementation does not itself prove a real third-party-host journey.
