from __future__ import annotations

from collections import defaultdict
from html import escape
from typing import Any

from .review_queue import review_queue
from .security import Mode, can_show_raw_intake, can_write


TABS = ("company", "notes", "recommendations", "artifacts", "raw")


def render_dashboard(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    active_tab: str = "company",
) -> str:
    mode = Mode(mode)
    apps = payload.get("applications", [])
    glossary = payload.get("glossary", [])
    selected = next((app for app in apps if app.get("id") == selected_application_id), apps[0] if apps else {})
    selected_keywords = selected.get("keywords") or []
    selected_term = selected_keyword or (selected_keywords[0] if selected_keywords else (glossary[0]["term"] if glossary else ""))
    term_data = next((term for term in glossary if term.get("term") == selected_term), glossary[0] if glossary else {})
    active_tab = active_tab if active_tab in TABS and (active_tab != "raw" or can_show_raw_intake(mode)) else "company"
    queue = payload.get("review_queue") or review_queue(payload)
    selected_queue = [item for item in queue if item.get("application_id") == selected.get("id")]
    keyword_queue = [item for item in selected_queue if item.get("field") == f"keyword:{selected_term}"]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for app in apps:
        grouped[app.get("status") or "draft"].append(app)

    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>AAAAT</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;margin:0;background:#f6f7f9;color:#18212f}header,.toolbar{padding:14px 18px;background:#fff;border-bottom:1px solid #d8dee8}",
        "main{display:grid;grid-template-columns:1.1fr 1.35fr .85fr;gap:14px;padding:14px}.column,.panel{background:#fff;border:1px solid #d8dee8;border-radius:6px;padding:12px}",
        ".skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:#fff;padding:8px}.board{display:grid;gap:10px}.card{border:1px solid #d8dee8;border-radius:6px;padding:10px;margin:8px 0}.card[aria-current='true']{border-color:#2f5f9f}.chip,.tab{display:inline-block;border:1px solid #91a4bc;border-radius:999px;padding:3px 8px;margin:2px;background:#eef3f8;color:#14355f;text-decoration:none}.tab[aria-current='page']{background:#dce8f5}.state{font-size:13px;color:#43566f}.art,.queue-item{border-top:1px solid #e6ebf1;padding-top:6px;margin-top:6px}.archived{opacity:.7}.identity{border:1px solid #d8dee8;border-radius:6px;padding:10px;background:#fbfcfe}.meta{display:flex;flex-wrap:wrap;gap:8px}.empty{color:#52657d}",
        "textarea,input,select{width:100%;box-sizing:border-box;margin:4px 0 8px;padding:7px}button{padding:7px 10px}form{border-top:1px solid #e6ebf1;margin-top:10px;padding-top:10px}",
        "</style></head><body>",
        "<a class='skip' href='#focused-application'>Skip to focused application</a>",
        f"<header><h1>AAAAT</h1><span class='state'>Mode: {escape(mode.value)}</span></header>",
        "<section class='toolbar'><input aria-label='Search applications' placeholder='Search company, role, keyword'></section>",
        "<main>",
        "<section class='column'><h2>Applications</h2><div class='board'>",
    ]
    for status, status_apps in grouped.items():
        html.append(f"<div><h3>{escape(status)}</h3>")
        for app in status_apps:
            app_id = escape(app.get("id", ""))
            current = " aria-current='true'" if app.get("id") == selected.get("id") else ""
            html.append(f"<article class='card'{current}>")
            html.append(f"<a href='/?application_id={app_id}&tab={escape(active_tab)}'><strong>{escape(app.get('company',''))}</strong></a><br>")
            html.append(f"<span>{escape(app.get('role',''))}</span>")
            html.append(f"<p class='state'>Status: {escape(app.get('status','draft'))} | Last: {escape(app.get('last_activity',''))}</p>")
            html.append(f"<p>Next: {escape(app.get('next_action','') or 'Not set')}</p>")
            html.append(f"<p class='state'>{escape(app.get('call_probability_label','Call probability: pending signal model'))}</p>")
            for keyword in app.get("keywords", []):
                html.append(f"<a class='chip' data-keyword='{escape(keyword)}' href='/?application_id={app_id}&keyword={escape(keyword)}&tab={escape(active_tab)}'>{escape(keyword)}</a>")
            html.append("</article>")
        html.append("</div>")
    html.append("</div>")

    if can_write(mode):
        html.append("<p><a data-write-control='raw-offer-intake-link' href='/intake'>Add raw offer intake</a></p>")
    html.append("</section>")

    html.append("<section class='panel' id='focused-application'><h2>Focused Application</h2>")
    if selected:
        app_id = escape(selected.get("id", ""))
        html.append("<div class='identity'>")
        html.append(f"<h3>{escape(selected.get('company',''))}</h3>")
        html.append(f"<p><strong>{escape(selected.get('role',''))}</strong></p>")
        html.append("<div class='meta'>")
        for label, key in [("Status", "status"), ("Priority", "priority"), ("Next", "next_action")]:
            html.append(f"<span><b>{label}:</b> {escape(str(selected.get(key, '')) or 'Not set')}</span>")
        html.append("</div>")
        if selected.get("pitch"):
            html.append(f"<p><b>Pitch:</b> {escape(str(selected.get('pitch')))}</p>")
        for keyword in selected_keywords:
            html.append(f"<a class='chip' data-keyword='{escape(keyword)}' href='/?application_id={app_id}&keyword={escape(keyword)}&tab={escape(active_tab)}'>{escape(keyword)}</a>")
        html.append("</div>")
    else:
        html.append("<p class='empty'>No applications yet.</p>")
    if selected:
        html.append(render_tabs(selected, selected_term, active_tab, mode))
        html.append(render_tab_content(selected, selected_queue, active_tab, mode))
    if can_write(mode) and selected:
        html.append("<details><summary>Manual field editing</summary>")
        html.append(render_application_update_form(selected))
        html.append(render_artifact_form(selected))
        html.append("</details>")
    html.append("</section>")

    html.append("<aside class='panel'><h2>Keyword Detail</h2>")
    html.append(f"<h3>{escape(term_data.get('term', selected_term))}</h3>")
    html.append(f"<p>{escape(term_data.get('definition', '') or 'No glossary definition yet.')}</p>")
    if selected:
        html.append(f"<p class='state'>Context: {escape(selected.get('company',''))} | {escape(selected.get('role',''))}</p>")
    for item in keyword_queue:
        html.append(f"<p class='queue-item'><b>{escape(item.get('priority',''))}</b>: {escape(item.get('recommended_action',''))}</p>")
    html.append("<h2>Agent Review Queue</h2>")
    queue_preview = selected_queue[:5] if selected else queue[:5]
    if queue_preview:
        for item in queue_preview:
            html.append(render_queue_item(item, active_tab))
    else:
        html.append("<p>No review queue items.</p>")
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


def render_tabs(selected: dict[str, Any], selected_term: str, active_tab: str, mode: Mode) -> str:
    app_id = escape(selected.get("id", ""))
    keyword = f"&keyword={escape(selected_term)}" if selected_term else ""
    labels = {
        "company": "Company",
        "notes": "Notes",
        "recommendations": "Recommendations",
        "artifacts": "Artifacts",
        "raw": "Raw intake",
    }
    html = ["<nav aria-label='Application detail tabs'>"]
    for tab in TABS:
        if tab == "raw" and not can_show_raw_intake(mode):
            continue
        current = " aria-current='page'" if tab == active_tab else ""
        html.append(f"<a class='tab' href='/?application_id={app_id}{keyword}&tab={tab}'{current}>{labels[tab]}</a>")
    html.append("</nav>")
    return "".join(html)


def render_tab_content(selected: dict[str, Any], queue_items: list[dict[str, Any]], active_tab: str, mode: Mode) -> str:
    if active_tab == "notes":
        return (
            "<section data-tab-panel='notes'><h3>Notes</h3>"
            f"<p><b>Notes:</b> {escape(str(selected.get('notes', '')) or 'Not set')}</p>"
            f"<p><b>Call notes/signals:</b> {escape(str(selected.get('call_signals', '')) or 'Not set')}</p>"
            f"<p><b>Form answers:</b> {escape(str(selected.get('form_answers', '')) or 'Not set')}</p></section>"
        )
    if active_tab == "recommendations":
        html = ["<section data-tab-panel='recommendations'><h3>Recommendations</h3>"]
        for key, label in [
            ("pitch", "Pitch"),
            ("risks_to_avoid", "Risks to avoid"),
            ("smart_question", "Smart question"),
            ("prepare_first", "Prepare first"),
            ("prepare_later", "Prepare later"),
            ("technical_reading", "Technical reading"),
        ]:
            html.append(f"<p><b>{label}:</b> {escape(str(selected.get(key, '')) or 'Not set')}</p>")
        html.append("<h4>Queue</h4>")
        if queue_items:
            for item in queue_items:
                html.append(render_queue_item(item, active_tab))
        else:
            html.append("<p>No missing recommendation fields.</p>")
        html.append("</section>")
        return "".join(html)
    if active_tab == "artifacts":
        artifacts = selected.get("artifacts", [])
        primary_artifacts = [artifact for artifact in artifacts if artifact.get("review_state") != "archived"]
        archived_artifacts = [artifact for artifact in artifacts if artifact.get("review_state") == "archived"]
        html = ["<section data-tab-panel='artifacts'><h3>Artifacts</h3>"]
        for artifact in primary_artifacts:
            html.append(render_artifact(artifact, can_write(mode)))
        if not primary_artifacts:
            html.append("<p class='empty'>No current artifacts.</p>")
        if archived_artifacts:
            html.append("<details><summary>Archived artifacts</summary>")
            for artifact in archived_artifacts:
                html.append(render_artifact(artifact, can_write(mode), archived=True))
            html.append("</details>")
        html.append("</section>")
        return "".join(html)
    if active_tab == "raw" and can_show_raw_intake(mode):
        app_id = escape(selected.get("id", ""))
        html = ["<section data-tab-panel='raw'><h3>Raw intake</h3>"]
        for item in selected.get("raw_intake", []):
            html.append(f"<p>{escape(item.get('content',''))}</p>")
        if can_write(mode):
            html.append(f"<form data-write-control='raw-intake' method='post' action='/api/applications/{app_id}/raw-intake'><textarea name='content'></textarea><button>Add intake</button></form>")
        html.append("</section>")
        return "".join(html)
    return (
        "<section data-tab-panel='company'><h3>Company</h3>"
        f"<p><b>Source:</b> {escape(str(selected.get('source', '')) or 'Not set')}</p>"
        f"<p><b>Source URL:</b> {render_safe_link(str(selected.get('source_url', '') or ''))}</p>"
        f"<p><b>Location:</b> {escape(str(selected.get('location', '')) or 'Not set')}</p>"
        f"<p><b>Remote:</b> {escape(str(selected.get('remote_mode', '')) or 'Not set')}</p>"
        f"<p><b>Company research:</b> {escape(str(selected.get('company_research', '')) or 'Not set')}</p>"
        f"<p><b>Offer snapshot:</b> {escape(str(selected.get('offer_snapshot', '')) or 'Not set')}</p></section>"
    )


def render_queue_item(item: dict[str, Any], active_tab: str) -> str:
    app_id = escape(item.get("application_id", ""))
    return (
        "<div class='queue-item'>"
        f"<a href='/?application_id={app_id}&tab={escape(active_tab)}'><b>{escape(item.get('company',''))}</b> {escape(item.get('role',''))}</a><br>"
        f"<span class='state'>{escape(item.get('priority',''))} | {escape(item.get('category',''))} | {escape(item.get('field',''))}</span>"
        f"<p>{escape(item.get('reason',''))} {escape(item.get('recommended_action',''))}</p>"
        "</div>"
    )


def render_safe_link(url: str) -> str:
    if not url:
        return "Not set"
    if url.startswith(("http://", "https://")):
        escaped = escape(url)
        return f"<a href='{escaped}' target='_blank' rel='noopener noreferrer'>{escaped}</a>"
    return escape(url)


def render_raw_offer_intake_page(mode: Mode | str) -> str:
    mode = Mode(mode)
    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>AAAAT Intake</title>",
        "<style>body{font-family:Arial,sans-serif;margin:0;background:#f6f7f9;color:#18212f}main,header{max-width:760px;margin:0 auto;padding:18px}textarea{width:100%;min-height:260px;box-sizing:border-box;padding:10px}button{padding:8px 12px}.panel{background:#fff;border:1px solid #d8dee8;border-radius:6px;padding:14px}</style>",
        "</head><body><header><h1>Raw Offer Intake</h1>",
        "<p><a href='/'>Back to dashboard</a></p></header><main><section class='panel'>",
    ]
    if can_write(mode):
        html.append("<form data-write-control='raw-offer-intake' method='post' action='/api/raw-offer-intake'><label for='content'>Paste raw offer text</label><textarea id='content' name='content' required></textarea><button>Create intake application</button></form>")
    else:
        html.append("<p>Read-only mode does not allow intake writes.</p>")
    html.append("</section></main></body></html>")
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
