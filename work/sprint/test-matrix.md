# Test Matrix

Acceptance hardening pass run on 2026-07-06 in `V:\SCVRI\Documents\GitHub\AAAAT`.

## Original Durable Contract Coverage

1. Database initializes: `tests/test_db.py::DbTests.test_database_initializes_application_raw_intake_and_artifact_provenance`
2. Application can be created: `tests/test_db.py::DbTests.test_database_initializes_application_raw_intake_and_artifact_provenance`
3. Raw intake can be added in full/local write path: `tests/test_db.py::DbTests.test_database_initializes_application_raw_intake_and_artifact_provenance`, `tests/test_cli_mcp.py::CliMcpTests.test_cli_basic_commands_work`
4. Dashboard payload contains applications and glossary: `tests/test_dashboard_modes.py::DashboardModeTests.test_payload_and_mode_controls`, `tests/test_server_api.py::ServerApiTests.test_health_and_dashboard_payload_include_applications_and_glossary`
5. Full dashboard contains Raw intake controls: `tests/test_dashboard_modes.py::DashboardModeTests.test_payload_and_mode_controls`
6. Read-only dashboard does not contain Raw intake/write controls: `tests/test_dashboard_modes.py::DashboardModeTests.test_payload_and_mode_controls`, `tests/test_server_api.py::ServerApiTests.test_read_only_mode_removes_write_and_raw_intake_controls`
7. Static demo export does not contain Raw intake/write controls: `tests/test_static_export.py::StaticExportTests.test_static_demo_uses_fake_payload_without_write_controls`
8. Static demo export uses fake demo payload: `tests/test_static_export.py::StaticExportTests.test_static_demo_uses_fake_payload_without_write_controls`, manual CLI smoke `export static-demo`
9. Profile variables render into LaTeX templates: `tests/test_templates.py::TemplateTests.test_profile_variables_render_into_latex`
10. Missing required template variables fail clearly: `tests/test_templates.py::TemplateTests.test_missing_required_template_variables_fail_clearly`
11. Generated artifacts are stored with provenance: `tests/test_db.py::DbTests.test_database_initializes_application_raw_intake_and_artifact_provenance`, `tests/test_cli_mcp.py::CliMcpTests.test_cli_basic_commands_work`
12. CLI basic commands work: `tests/test_cli_mcp.py::CliMcpTests.test_cli_basic_commands_work`, manual CLI smoke
13. MCP schemas validate: `tests/test_cli_mcp.py::CliMcpTests.test_mcp_descriptor_validates`, `tests/test_cli_mcp.py::CliMcpTests.test_mcp_descriptor_is_capability_only_no_llm_calls`, `python -B -m aaaat.cli mcp-validate`

## Additional Audit Coverage

- Server default loopback binding: `tests/test_server_api.py::ServerApiTests.test_launch_binds_to_loopback_by_default`
- Static demo privacy boundaries: `tests/test_static_export.py::StaticExportTests.test_static_demo_uses_fake_payload_without_write_controls`
- Template source privacy boundaries: `tests/test_templates.py::TemplateTests.test_source_templates_use_variables_not_private_identity`
- Application variable rendering: `tests/test_templates.py::TemplateTests.test_application_variables_render_into_cover_letter`
- Dependency and Git policy: `tests/test_dependency_policy.py`
- MCP descriptor-only behavior: `tests/test_cli_mcp.py::CliMcpTests.test_mcp_descriptor_is_capability_only_no_llm_calls`

## Sprint 2 Manual Workflow Coverage

- Full-mode API/dashboard can create and update application data: `tests/test_server_api.py::ServerApiTests.test_full_mode_api_and_forms_create_update_manual_data`
- Full-mode dashboard shows write forms: `tests/test_dashboard_modes.py::DashboardModeTests.test_payload_and_mode_controls`
- Read-only mode hides controls and rejects writes: `tests/test_server_api.py::ServerApiTests.test_read_only_mode_removes_write_and_raw_intake_controls`
- Static demo remains fake and write-free: `tests/test_static_export.py::StaticExportTests.test_static_demo_uses_fake_payload_without_write_controls`
- Sparse applications render cleanly: `tests/test_dashboard_modes.py::DashboardModeTests.test_sparse_application_renders_cleanly`
- Profile setup reports and clears missing render variables: `tests/test_templates.py::TemplateTests.test_profile_missing_reports_and_clears_required_variables`
- Artifact review-state changes persist and archived artifacts sort secondary: `tests/test_db.py::DbTests.test_artifact_review_state_changes_and_archived_sorts_secondary`
- CLI parity commands work: `tests/test_cli_mcp.py::CliMcpTests.test_cli_basic_commands_work`
- Manual browser/API smoke: temporary full-mode and read-only servers on `127.0.0.1`, with application/profile/glossary/raw-intake/artifact writes in full mode, read-only write rejection, and static demo privacy check.

## Sprint 3 Dashboard IA And Review Queue Coverage

- Application list and focused view identity: `tests/test_dashboard_modes.py::DashboardModeTests.test_application_list_focused_view_keyword_and_tabs_are_structured`
- Keyword drilldown context: `tests/test_dashboard_modes.py::DashboardModeTests.test_application_list_focused_view_keyword_and_tabs_are_structured`
- Tabs and raw/full-mode behavior: `tests/test_dashboard_modes.py::DashboardModeTests.test_application_list_focused_view_keyword_and_tabs_are_structured`
- Main dashboard has no always-visible create form: `tests/test_dashboard_modes.py::DashboardModeTests.test_sparse_application_renders_cleanly`
- Sparse application rendering: `tests/test_dashboard_modes.py::DashboardModeTests.test_sparse_application_renders_cleanly`
- Deterministic review queue generation and shrink behavior: `tests/test_review_queue.py::ReviewQueueTests.test_review_queue_includes_missing_fields_and_keyword_definitions_then_shrinks`
- Raw offer intake placeholder and queue behavior: `tests/test_review_queue.py::ReviewQueueTests.test_raw_offer_intake_creates_placeholder_app_raw_intake_and_queue_item`
- CLI review queue and raw-offer intake: `tests/test_cli_mcp.py::CliMcpTests.test_cli_basic_commands_work`
- API review queue and raw-offer intake: `tests/test_server_api.py::ServerApiTests.test_health_and_dashboard_payload_include_applications_and_glossary`, `tests/test_server_api.py::ServerApiTests.test_full_mode_api_and_forms_create_update_manual_data`
- MCP review queue discovery: `tests/test_cli_mcp.py::CliMcpTests.test_mcp_descriptor_validates`

## Verification Commands

```powershell
python -B -m unittest discover -s tests
python -B -m aaaat.cli mcp-validate
```

Manual smoke used temporary storage and exercised:

```powershell
python -B -m aaaat.cli --storage <tmp>\private init
python -B -m aaaat.cli --storage <tmp>\private app create --company "Audit Demo Co" --role "Audit Engineer"
python -B -m aaaat.cli --storage <tmp>\private app list
python -B -m aaaat.cli --storage <tmp>\private app show <created_id>
python -B -m aaaat.cli --storage <tmp>\private intake add <created_id> --content "Audit intake"
python -B -m aaaat.cli --storage <tmp>\private artifact list <created_id>
python -B -m aaaat.cli --storage <tmp>\private profile set display_name "Audit Candidate"
python -B -m aaaat.cli --storage <tmp>\private profile set email "audit@example.invalid"
python -B -m aaaat.cli --storage <tmp>\private profile set summary.default "Audit summary"
python -B -m aaaat.cli --storage <tmp>\private render cv --output <tmp>\cv.tex
python -B -m aaaat.cli --storage <tmp>\private render cover-letter <created_id> --body "Audit body" --output <tmp>\cover-letter.tex
python -B -m aaaat.cli export static-demo <tmp>\static-demo.html
python -B -m aaaat.cli agent-guide
```
