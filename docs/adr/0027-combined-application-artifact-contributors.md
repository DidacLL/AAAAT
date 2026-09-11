# ADR 0027 — Combined application artifacts retain explicit document contributors

- Status: Accepted
- Date: 2026-09-11
- Decision class: C
- Issue: #279

## Context

AAAAT already produces a combined CV + cover-letter packet without creating a third persistent working-document kind. Candidature artifact retention, however, represented exactly one contributing working document and only `cv` or `cover_letter` artifacts. That cannot truthfully represent an exact retained combined packet while preserving which CV and cover letter produced it.

## Decision

A retained application artifact remains one immutable candidature artifact. It may be one of three bounded kinds: `cv`, `cover_letter`, or `combined`.

Contributor identity is stored explicitly by role:

- `cv_document_id` is populated for CV and combined artifacts;
- `cover_letter_document_id` is populated for cover-letter and combined artifacts;
- a combined artifact requires both distinct document IDs.

The combined artifact reuses the existing combined-document production path and retains that complete output project under the existing authoritative artifact directory. It does not create a persistent combined working document, generic artifact-contributor graph, arbitrary list of contributors, or second PDF-combination implementation.

Both contributing working documents must already be associated with the candidature before combined retention. Renderer/preload authority remains ID-only; trusted main-process code resolves the workspace, documents, output and retained paths.

## Consequences

Single-document retained artifacts remain the same product concept and are migrated into the role-specific contributor columns. Combined retained packets can now preserve both provenance roles and remain inspectable through the existing retained-PDF open capability.

Migration 011 performs the forward representation change. Migrations 001–010 remain immutable.
