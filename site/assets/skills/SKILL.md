---
name: aaaat
description: Work with the user's local AAAAT job-application workspace through its connected MCP tools, including prepared application tasks and explicitly selected application documents. Use editable text requests as the fallback when tools are unavailable.
---

# Work with AAAAT

Use when the user asks you to keep opportunity material, fill prepared application information, or work on application documents in AAAAT. AAAAT owns the local workspace, permissions, validation and document presentation. Help with the user's current task using the tools and context AAAAT provides.

## Connect and choose the task

The user obtains the local MCP **Command** and **Arguments** from the packaged app under **Settings → AI → Connect another AI → Connection setup**. Register those exact values in a host that supports local stdio MCP servers. Arguments include `--mcp --workspace "the user's workspace folder"`. Do not guess an executable or workspace path. This instruction file does not register a server or provide credentials.

Discover the available AAAAT tools and their current input schemas. Use their returned task/session references; do not invent internal IDs or reuse references from another session. If a prepared request or document target is unavailable, tell the user which selection or permission is missing in AAAAT. Do not bypass it through files, SQL, screen capture or shell commands.

The user can put this file in project/custom instructions. A host with folder-based skills may require a file named `SKILL.md`; follow that host's loading convention, retaining this content.

## Keep an opportunity

Use `candidature_create` for one new application from one retained Source when the user requests creation. Keep the original material. This action does not mean the user requested job discovery, application submission or unrelated documents.

## Complete prepared application information

1. Use `application_information_task_read` to read the task the user selected and allowed through **application → ⋯ → AI task → Application details → 👁**.
2. Use only its supplied task-local field and choice references and its bounded context. Supply the useful requested information; do not invent missing facts.
3. Return proposals through `application_information_proposals_submit`. AAAAT validates them and presents them on the application's fields for user review. Submission does not itself save application fields.

Do not create fields or Tags, rank opportunities, add scores or append unrelated career advice to this task.

## Application documents

For an existing application, the user must separately select its document access under **CV + cover letter → AI access**. Application-information/interview permission is distinct. A newly created application can also be bound to document work in the current session.

1. Use `application_document_target_read` to obtain the explicitly selected existing application when needed. Do not assume whichever application you mentioned is selected.
2. Use `reusable_cvs_list` for available CV names. Help the user choose; use `reusable_cv_read` only for that chosen CV. Do not read every CV merely to compare them.
3. Use `application_cv_create` to create an editable application CV from the chosen reusable CV. Creation, writing and rendering are separate actions.
4. For requested wording changes, use `cv_field_context_read` and then `cv_field_write` for one existing Title, Subtitle or Description field at a time. Preserve the supplied facts and every other field.
5. Use `application_cover_letter_create` for an empty application letter, then `cover_letter_write` for the completed bounded draft. A create action alone does not write a letter.
6. When the user wants output, inspect `document_rendering_status` and use `document_render` for the session-bound CV or letter. It returns success/failure, not the PDF itself. The user opens finished output in AAAAT.

Treat `[USERPRIVATE:…]` placeholders exactly as supplied. Do not expand, infer or paraphrase their hidden values. AAAAT restores only exact, unambiguous placeholders it supplied. Do not request private data to work around this boundary.

Document tools do not create or reorder sections/blocks, choose layouts or Blueprints, redesign the CV, browse the document collection, or expose PDF/TeX contents and local paths. The user makes composition and presentation choices in AAAAT. Tool-applied document wording remains ordinary editable document content; do not claim all writes are merely proposals awaiting a separate acceptance step.

## Secondary interview request

If the user specifically requests it, read `interview_preparation_context_read` for the permitted request. Return useful Markdown/plain text grounded in that context. Use `interview_preparation_result_save` only to retain the completed result as a Source. Do not turn it into application-field proposals or guarantee the accuracy of model advice.

## Optional setup help

Only perform setup actions the user requested and AAAAT enabled. `installer_status_read` and `configurator_status_read` supply bounded setup state. `installer_rendering_self_test` requires the separate installer permission; connection save/select tools require the configurator permission. This permission does not grant arbitrary installation, shell commands, filesystem changes or credential access.

## Fallback without connected tools

The user can open **application → ⋯ → AI task**, edit the complete request and Copy/Export it. Follow that visible request. For Application details, return the exact structured proposal shape and references it requests, so **Result → Use suggestions** or Import can validate it. For Interview, return Markdown/plain text for **Save as Source**. Do not claim to have changed AAAAT when you only returned text.

If a call fails or a permission is unavailable, report the specific failure and leave the user's manual work intact. Do not broaden access or repeatedly retry unchanged failures. AAAAT's tool boundary is separate from any broader computer access the assistant host may independently have.
