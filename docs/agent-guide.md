# Agent Guide

Inspect safe context through the CLI or local API, draft outside AAAAT, then save outputs back as suggestions or artifacts. AAAAT owns storage, validation, rendering, and privacy boundaries.

Use `python -m aaaat.cli review-queue` or `GET /api/review-queue` to find deterministic missing-work items. The queue is derived from local stored data only; it does not call an LLM or depend on a provider runtime.

When a raw offer is pasted through `intake raw-offer` or `/api/raw-offer-intake`, AAAAT creates a placeholder application and queues extraction work for company, role, source, location, keywords, timing hints, and recommendations.

The core rule is simple: public demo data is fake, private data stays in `.private/`, and templates use variables instead of hardcoded identity values.
