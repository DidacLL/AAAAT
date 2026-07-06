from __future__ import annotations

from collections import defaultdict
from html import escape
from typing import Any

from .security import Mode, can_show_raw_intake, can_write


def render_dashboard(payload: dict[str, Any], mode: Mode | str = Mode.FULL, selected_application_id: str | None = None) -> str:
    mode = Mode(mode)
    apps = payload.get("applications", [])
    glossary = payload.get("glossary", [])
    selected = next((app for app in apps if app.get("id") == selected_application_id), apps[0] if apps else {})
    selected_keywords = selected.get("keywords") or []
    selected_term = selected_keywords[0] if selected_keywords else (glossary[0]["term"] if glossary else "")
    term_data = next((term for term in glossary if term.get("term") == selected_term), glossary[0] if glossary else {})
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for app in apps:
        grouped[app.get("status") or "draft"].append(app)

    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>AAAAT</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;margin:0;background:#f6f7f9;color:#18212f}header,.toolbar{padding:14px 18px;background:#fff;border-bottom:1px solid #d8dee8}",
        "main{display:grid;grid-template-columns:1.4fr 1fr .8fr;gap:14px;padding:14px}.column,.panel{background:#fff;border:1px solid #d8dee8;border-radius:6px;padding:12px}",
        ".board{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.card{border:1px solid #d8dee8;border-radius:6px;padding:10px;margin:8px 0}.chip{display:inline-block;border:1px solid #91a4bc;border-radius:999px;padding:2px 7px;margin:2px;background:#eef3f8}.state{font-size:12px;color:#53657a}.art{border-top:1px solid #e6ebf1;padding-top:6px;margin-top:6px}.archived{opacity:.7}.call-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}.call-box{border:1px solid #e1e7ef;border-radius:6px;padding:8px;background:#fbfcfe}.empty{color:#66788f}",
        "textarea,input,select{width:100%;box-sizing:border-box;margin:4px 0 8px;padding:7px}button{padding:7px 10px}form{border-top:1px solid #e6ebf1;margin-top:10px;padding-top:10px}",
        "</style></head><body>",
        f"<header><h1>AAAAT</h1><span class='state'>Mode: {escape(mode.value)}</span></header>",
        "<section class='toolbar'><input aria-label='Search applications' placeholder='Search company, role, keyword'></section>",
        "<main>",
        "<section class='column'><h2>Applications</h2><div class='board'>",
    ]
    for status, status_apps in grouped.items():
        html.append(f"<div><h3>{escape(status)}</h3>")
        for app in status_apps:
            html.append("<article class='card'>")
            html.append(f"<a href='/?application_id={escape(app.get('id',''))}'><strong>{escape(app.get('company',''))}</strong></a><br>")
            html.append(f"<span>{escape(app.get('role',''))}</span>")
            html.append(f"<p>Priority: {escape(app.get('priority','normal'))}</p>")
            html.append(f"<p>Next: {escape(app.get('next_action',''))}</p>")
            html.append("".join(f"<button class='chip' data-keyword='{escape(k)}'>{escape(k)}</button>" for k in app.get("keywords", [])))
            html.append("</article>")
        html.append("</div>")
    html.append("</div>")

    if can_write(mode):
        html.append("<form data-write-control='create-application' method='post' action='/api/applications'><h3>Create Application</h3>")
        html.append("<input name='company' placeholder='Company' required>")
        html.append("<input name='role' placeholder='Role' required>")
        html.append("<input name='next_action' placeholder='Next action'>")
        html.append("<button>Create</button></form>")
    html.append("</section>")

    html.append("<section class='panel'><h2>Application Detail</h2>")
    if selected:
        html.append("<div class='call-grid'>")
        for label, key in [("Company", "company"), ("Role", "role"), ("Status", "status"), ("Priority", "priority"), ("Next", "next_action")]:
            html.append(f"<div class='call-box'><b>{label}</b><br>{escape(str(selected.get(key, '')) or 'Not set')}</div>")
        html.append("</div>")
    else:
        html.append("<p class='empty'>No applications yet.</p>")
    detail_fields = [
        ("Company", "company"),
        ("Role", "role"),
        ("Status", "status"),
        ("Source", "source"),
        ("Source URL", "source_url"),
        ("Location", "location"),
        ("Remote", "remote_mode"),
        ("Next Action", "next_action"),
        ("Notes", "notes"),
        ("Call Signals", "call_signals"),
        ("Technical Reading", "technical_reading"),
        ("Pitch", "pitch"),
        ("Smart Question", "smart_question"),
        ("Risks To Avoid", "risks_to_avoid"),
        ("Prepare First", "prepare_first"),
        ("Prepare Later", "prepare_later"),
        ("Offer Snapshot", "offer_snapshot"),
        ("Company Research", "company_research"),
        ("Form Answers", "form_answers"),
    ]
    if selected:
        for label, key in detail_fields:
            html.append(f"<p><b>{label}:</b> {escape(str(selected.get(key, '')) or 'Not set')}</p>")
    html.append("<h3>Recruiter Call</h3>")
    html.append(f"<p><b>Pitch:</b> {escape(str(selected.get('pitch', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Risks to avoid:</b> {escape(str(selected.get('risks_to_avoid', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Smart question:</b> {escape(str(selected.get('smart_question', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Call notes/signals:</b> {escape(str(selected.get('call_signals', '')) or 'Not set')}</p>")
    html.append("<h3>Prepare</h3>")
    html.append(f"<p><b>First:</b> {escape(str(selected.get('prepare_first', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Later:</b> {escape(str(selected.get('prepare_later', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Technical reading:</b> {escape(str(selected.get('technical_reading', '')) or 'Not set')}</p>")
    html.append(f"<p><b>Company research:</b> {escape(str(selected.get('company_research', '')) or 'Not set')}</p>")
    html.append("<h3>Generated Artifacts</h3>")
    artifacts = selected.get("artifacts", []) if selected else []
    primary_artifacts = [artifact for artifact in artifacts if artifact.get("review_state") != "archived"]
    archived_artifacts = [artifact for artifact in artifacts if artifact.get("review_state") == "archived"]
    for artifact in primary_artifacts:
        html.append(render_artifact(artifact, can_write(mode)))
    if not primary_artifacts:
        html.append("<p class='empty'>No current artifacts.</p>")
    if archived_artifacts:
        html.append("<details><summary>Archived artifacts</summary>")
        for artifact in archived_artifacts:
            html.append(render_artifact(artifact, can_write(mode), archived=True))
        html.append("</details>")
    if can_write(mode) and selected:
        html.append(render_application_update_form(selected))
        if can_show_raw_intake(mode):
            html.append(f"<form data-write-control='raw-intake' method='post' action='/api/applications/{escape(selected.get('id',''))}/raw-intake'><h3>Raw intake</h3><textarea name='content'></textarea><button>Add intake</button></form>")
        html.append(render_artifact_form(selected))
    html.append("</section>")

    html.append("<aside class='panel'><h2>Glossary</h2>")
    html.append(f"<h3>{escape(term_data.get('term', selected_term))}</h3>")
    html.append(f"<p>{escape(term_data.get('definition', ''))}</p>")
    html.append("<h2>Profile Setup</h2>")
    missing = payload.get("missing_profile_variables", [])
    if missing:
        html.append("<p class='empty'>Missing: " + escape(", ".join(missing)) + "</p>")
    else:
        html.append("<p>Profile variables ready for templates.</p>")
    if can_write(mode):
        html.append("<form data-write-control='glossary' method='post' action='/api/glossary'><h3>Glossary Term</h3><input name='term' placeholder='Term' required><textarea name='definition' placeholder='Definition'></textarea><input name='category' placeholder='Category'><button>Save term</button></form>")
        html.append("<form data-write-control='profile' method='post' action='/api/profile/variables'><input type='hidden' name='_method' value='PATCH'><h3>Profile Variable</h3><input name='key' placeholder='display_name' required><textarea name='value' placeholder='Value'></textarea><button>Save variable</button></form>")
    html.append("<h2>Review State</h2><p>draft / reviewed / submitted / archived</p>")
    html.append("</aside></main></body></html>")
    return "".join(html)


def render_application_update_form(selected: dict[str, Any]) -> str:
    app_id = escape(selected.get("id", ""))
    fields = [
        "company",
        "role",
        "status",
        "priority",
        "next_action",
        "pitch",
        "risks_to_avoid",
        "smart_question",
        "call_signals",
        "prepare_first",
        "prepare_later",
    ]
    html = [f"<form data-write-control='update-application' method='post' action='/api/applications/{app_id}'><input type='hidden' name='_method' value='PATCH'><h3>Update Application</h3>"]
    for field in fields:
        value = escape(str(selected.get(field, "")))
        if field in {"pitch", "risks_to_avoid", "smart_question", "call_signals", "prepare_first", "prepare_later"}:
            html.append(f"<textarea name='{field}' placeholder='{field}'>{value}</textarea>")
        else:
            html.append(f"<input name='{field}' placeholder='{field}' value='{value}'>")
    html.append(f"<input name='keywords' placeholder='keywords, comma separated' value='{escape(', '.join(selected.get('keywords', [])))}'>")
    html.append("<button>Save application</button></form>")
    return "".join(html)


def render_artifact_form(selected: dict[str, Any]) -> str:
    app_id = escape(selected.get("id", ""))
    return (
        "<form data-write-control='artifact' method='post' action='/api/artifacts'><h3>Save Artifact Record</h3>"
        f"<input type='hidden' name='application_id' value='{app_id}'>"
        "<input name='artifact_type' placeholder='cover_letter' required>"
        "<input name='path' placeholder='local path' required>"
        "<input name='label' placeholder='Label' required>"
        "<select name='review_state'><option>draft</option><option>reviewed</option><option>submitted</option><option>archived</option></select>"
        "<textarea name='notes' placeholder='Notes'></textarea>"
        "<button>Save artifact</button></form>"
    )


def render_artifact(artifact: dict[str, Any], writable: bool, archived: bool = False) -> str:
    class_name = "art archived" if archived else "art"
    artifact_id = escape(artifact.get("id", ""))
    html = [
        f"<div class='{class_name}'><b>{escape(artifact.get('label',''))}</b> ",
        f"<span class='state'>{escape(artifact.get('review_state','draft'))}</span><br>",
        escape(artifact.get("path", "")),
    ]
    if writable and artifact_id:
        html.append(f"<form data-write-control='artifact-state' method='post' action='/api/artifacts/{artifact_id}'><input type='hidden' name='_method' value='PATCH'>")
        html.append("<select name='review_state'><option>draft</option><option>reviewed</option><option>submitted</option><option>archived</option></select>")
        html.append("<input name='notes' placeholder='State notes'>")
        html.append("<button>Update state</button></form>")
    html.append("</div>")
    return "".join(html)
