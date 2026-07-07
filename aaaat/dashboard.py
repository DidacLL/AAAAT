from __future__ import annotations

import re
from collections import defaultdict
from html import escape
from typing import Any
from urllib.parse import quote

from .review_queue import review_queue
from .security import Mode, can_show_raw_intake, can_write


TABS = ("keyword", "company", "notes", "queue", "artifacts", "raw")
APP_FIELDS = {
    "status": "Status",
    "priority": "Priority",
    "next_action": "Next action",
    "source": "Source",
    "source_url": "Source link",
    "location": "Location",
    "remote_mode": "Remote",
    "pitch": "Pitch",
    "risks_to_avoid": "Risks to avoid",
    "smart_question": "Smart question",
    "call_signals": "Call notes/signals",
    "notes": "Notes",
    "prepare_first": "Prepare first",
    "prepare_later": "Prepare later",
    "technical_reading": "Technical reading",
    "company_research": "Company research",
    "offer_snapshot": "Offer snapshot",
}
TEXTAREA_FIELDS = {
    "pitch",
    "risks_to_avoid",
    "smart_question",
    "call_signals",
    "notes",
    "prepare_first",
    "prepare_later",
    "technical_reading",
    "company_research",
    "offer_snapshot",
}


def render_dashboard(
    payload: dict[str, Any],
    mode: Mode | str = Mode.FULL,
    selected_application_id: str | None = None,
    selected_keyword: str | None = None,
    active_tab: str = "company",
) -> str:
    mode = Mode(mode)
    apps = payload.get("applications", [])
    selected = next((app for app in apps if app.get("id") == selected_application_id), apps[0] if apps else {})
    selected_keywords = selected.get("keywords") or []
    selected_term = selected_keyword or (selected_keywords[0] if selected_keywords else "")
    if not selected_term and payload.get("glossary"):
        selected_term = payload["glossary"][0].get("term", "")
    active_tab = normalize_tab(active_tab, mode)
    queue = payload.get("review_queue") or review_queue(payload)

    return render_shell(payload, mode, selected, selected_term, active_tab, queue)


def normalize_tab(active_tab: str, mode: Mode) -> str:
    if active_tab not in TABS:
        return "company"
    if active_tab == "raw" and not can_show_raw_intake(mode):
        return "company"
    return active_tab


def render_shell(
    payload: dict[str, Any],
    mode: Mode,
    selected: dict[str, Any],
    selected_term: str,
    active_tab: str,
    queue: list[dict[str, Any]],
) -> str:
    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>AAAAT</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;margin:0;background:#f4f6f8;color:#172131}a{color:#174a7c}button,input,textarea,select{font:inherit}",
        ".skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:#fff;padding:8px;z-index:3}",
        "header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 18px;background:#fff;border-bottom:1px solid #d8dee8}",
        "header h1{font-size:22px;margin:0}.mode{font-size:12px;color:#53677f}.command{display:flex;gap:10px;align-items:center;padding:10px 18px;background:#fff;border-bottom:1px solid #d8dee8}.command input{flex:1;padding:8px;border:1px solid #aeb9c8;border-radius:4px}.command a{white-space:nowrap}",
        ".shell{display:grid;grid-template-columns:minmax(250px,.9fr) minmax(420px,1.45fr) minmax(290px,.9fr);gap:12px;padding:12px}.surface{background:#fff;border:1px solid #d8dee8;border-radius:6px;min-width:0}.surface h2{font-size:15px;margin:0;padding:10px 12px;border-bottom:1px solid #e5eaf0}",
        ".app-list{display:grid}.app-row{display:block;padding:10px 12px;border-bottom:1px solid #edf1f5;text-decoration:none;color:inherit}.app-row:hover,.app-row:focus{background:#f7fafc;outline:2px solid transparent}.app-row[aria-current='true']{border-left:3px solid #2d6f9f;background:#f3f8fc}.app-title{font-weight:700;font-size:15px}.app-role{font-size:14px;color:#2e3c4f}.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:12px;color:#53677f}.chip{display:inline-block;border:1px solid #9aacbf;border-radius:999px;padding:2px 7px;margin:2px 3px 0 0;background:#eef3f7;color:#14355f;text-decoration:none;font-size:12px}",
        ".identity{padding:14px 16px;border-bottom:1px solid #e5eaf0}.identity h2{border:0;padding:0;margin:0 0 2px;font-size:22px}.identity .role{font-size:16px;color:#2e3c4f}.identity .pitch{margin-top:10px;line-height:1.4}.canvas-body{padding:12px 16px}.canvas-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{border:1px solid #e5eaf0;border-radius:5px;padding:9px;background:#fbfcfd}.field label,.field .label{display:block;font-size:12px;font-weight:700;color:#53677f}.field .value{margin-top:4px;line-height:1.35}.add{color:#6b7e95}.inline-edit{margin-top:6px}.inline-edit summary{cursor:pointer;color:#174a7c;font-size:12px}.inline-edit input,.inline-edit textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:6px;border:1px solid #aeb9c8;border-radius:4px}.inline-edit textarea{min-height:72px}.inline-edit button{margin-top:6px}",
        ".tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #e5eaf0;overflow:auto}.tab{border:1px solid #9aacbf;border-radius:999px;padding:4px 9px;text-decoration:none;font-size:13px}.tab[aria-current='page']{background:#dfeaf3}.inspector-body{padding:12px}.queue-item,.artifact{border-top:1px solid #e5eaf0;padding:8px 0}.queue-item:first-child,.artifact:first-child{border-top:0}.empty{color:#62768d}.raw-link{display:inline-block;margin:8px 0 0}.compact-form{margin-top:8px;border-top:1px solid #e5eaf0;padding-top:8px}.compact-form input,.compact-form textarea,.compact-form select{width:100%;box-sizing:border-box;margin:4px 0 6px;padding:6px;border:1px solid #aeb9c8;border-radius:4px}.compact-form textarea{min-height:76px}.archived{opacity:.68}@media(max-width:980px){.shell{grid-template-columns:1fr}.canvas-grid{grid-template-columns:1fr}}",
        "</style></head><body>",
        "<a class='skip' href='#selected-application'>Skip to selected application</a>",
        f"<header><h1>AAAAT</h1><span class='mode'>Mode: {escape(mode.value)}</span></header>",
        render_command_bar(mode),
        "<main class='shell'>",
        render_app_list(payload.get("applications", []), selected, selected_term, active_tab, mode),
        render_selected_canvas(selected, selected_term, active_tab, mode),
        render_inspector(payload, selected, selected_term, active_tab, mode, queue),
        "</main></body></html>",
    ]
    return "".join(html)


def render_command_bar(mode: Mode) -> str:
    html = ["<section class='command' aria-label='Command and search'><input aria-label='Search applications' placeholder='Search company, role, keyword'>"]
    if can_write(mode):
        html.append("<a data-write-control='raw-offer-entry-link' href='/intake'>Add raw offer</a>")
    html.append("</section>")
    return "".join(html)


def render_app_list(apps: list[dict[str, Any]], selected: dict[str, Any], selected_term: str, active_tab: str, mode: Mode) -> str:
    html = ["<section class='surface' aria-label='Applications'><h2>Applications</h2><div class='app-list'>"]
    if not apps:
        html.append("<p class='empty' style='padding:12px'>No applications yet.</p>")
    for app in apps:
        app_id = escape(app.get("id", ""))
        current = " aria-current='true'" if app.get("id") == selected.get("id") else ""
        html.append(f"<a class='app-row' data-app-row href='/?application_id={app_id}&tab={escape(active_tab)}'{current}>")
        html.append(f"<span class='app-title'>{escape(display_value(app, 'company', 'Add company'))}</span><br>")
        html.append(f"<span class='app-role'>{escape(display_value(app, 'role', 'Add role'))}</span>")
        html.append("<span class='meta'>")
        html.append(f"<span>{escape(app.get('status') or 'draft')}</span>")
        if app.get("next_action"):
            html.append(f"<span>Next: {escape(str(app.get('next_action')))}</span>")
        html.append(f"<span>Last: {escape(str(app.get('last_activity') or app.get('updated_at') or app.get('created_at') or ''))}</span>")
        html.append(f"<span>{escape(app.get('call_probability_label','Call probability: pending signal model'))}</span>")
        html.append("</span><span>")
        for keyword in app.get("keywords", []):
            html.append(keyword_link(app_id, keyword, active_tab))
        html.append("</span></a>")
    html.append("</div>")
    if can_write(mode):
        html.append("<p style='padding:0 12px 12px'><a class='raw-link' data-raw-offer-entry href='/intake'>Open raw-offer intake</a></p>")
    html.append("</section>")
    return "".join(html)


def render_selected_canvas(selected: dict[str, Any], selected_term: str, active_tab: str, mode: Mode) -> str:
    html = ["<section class='surface' id='selected-application' data-selected-app>"]
    if not selected:
        html.append("<h2>Selected application</h2><div class='canvas-body'><p class='empty'>No applications yet.</p></div></section>")
        return "".join(html)
    app_id = escape(selected.get("id", ""))
    html.append("<div class='identity'>")
    html.append(f"<h2>{escape(display_value(selected, 'company', 'Add company'))}</h2>")
    html.append(f"<div class='role'>{escape(display_value(selected, 'role', 'Add role'))}</div>")
    html.append("<div class='meta'>")
    for key in ("status", "priority", "next_action"):
        label = APP_FIELDS[key]
        value = selected.get(key) or "Add " + label.lower()
        html.append(f"<span><b>{label}:</b> {escape(str(value))}</span>")
    html.append("</div><div>")
    for keyword in selected.get("keywords", []):
        html.append(keyword_link(app_id, keyword, active_tab))
    html.append("</div>")
    if selected.get("pitch"):
        html.append(f"<div class='pitch'>{render_value(selected.get('pitch', ''))}</div>")
    elif can_write(mode):
        html.append("<div class='pitch add'>Add short pitch</div>")
    html.append("</div>")

    html.append("<div class='canvas-body'><div class='canvas-grid'>")
    for field in ("status", "priority", "next_action", "pitch", "risks_to_avoid", "smart_question", "prepare_first", "company_research"):
        html.append(render_inline_field(selected, field, mode))
    html.append("</div>")
    if can_write(mode):
        html.append(render_keywords_inline(selected))
    html.append("</div></section>")
    return "".join(html)


def render_inspector(
    payload: dict[str, Any],
    selected: dict[str, Any],
    selected_term: str,
    active_tab: str,
    mode: Mode,
    queue: list[dict[str, Any]],
) -> str:
    selected_queue = [item for item in queue if selected and item.get("application_id") == selected.get("id")]
    glossary = payload.get("glossary", [])
    term_data = next((term for term in glossary if term.get("term") == selected_term), {})
    html = ["<aside class='surface' aria-label='Inspector'>", render_inspector_tabs(selected, selected_term, active_tab, mode), "<div class='inspector-body'>"]
    if active_tab == "keyword":
        html.append(render_keyword_panel(selected, selected_term, term_data, selected_queue, mode))
    elif active_tab == "notes":
        html.append(render_notes_panel(selected, mode))
    elif active_tab == "queue":
        html.append(render_queue_panel(selected_queue if selected else queue, active_tab))
    elif active_tab == "artifacts":
        html.append(render_artifacts_panel(selected, mode))
    elif active_tab == "raw" and can_show_raw_intake(mode):
        html.append(render_raw_panel(selected, mode))
    else:
        html.append(render_company_panel(selected, payload, mode))
    html.append("</div></aside>")
    return "".join(html)


def render_inspector_tabs(selected: dict[str, Any], selected_term: str, active_tab: str, mode: Mode) -> str:
    labels = {
        "keyword": "Keyword",
        "company": "Company",
        "notes": "Notes",
        "queue": "Queue",
        "artifacts": "Artifacts",
        "raw": "Raw intake",
    }
    app_id = quote(str(selected.get("id", ""))) if selected else ""
    keyword = f"&keyword={quote(selected_term)}" if selected_term else ""
    html = ["<nav class='tabs' aria-label='Inspector tabs'>"]
    for tab in TABS:
        if tab == "raw" and not can_show_raw_intake(mode):
            continue
        current = " aria-current='page'" if tab == active_tab else ""
        html.append(f"<a class='tab' data-inspector-tab='{tab}' href='/?application_id={app_id}{keyword}&tab={tab}'{current}>{labels[tab]}</a>")
    html.append("</nav>")
    return "".join(html)


def render_inline_field(selected: dict[str, Any], field: str, mode: Mode) -> str:
    label = APP_FIELDS[field]
    value = str(selected.get(field) or "")
    html = ["<div class='field'>", f"<span class='label'>{escape(label)}</span>"]
    if value:
        html.append(f"<div class='value'>{render_value(value)}</div>")
    else:
        html.append(f"<div class='value add'>Add {escape(label.lower())}</div>")
    if can_write(mode):
        html.append(render_field_editor(selected, field, value, label))
    html.append("</div>")
    return "".join(html)


def render_field_editor(selected: dict[str, Any], field: str, value: str, label: str) -> str:
    app_id = escape(selected.get("id", ""))
    input_id = f"field-{escape(field)}"
    html = [
        f"<details class='inline-edit' data-inline-field='{escape(field)}'>",
        f"<summary>{'Edit' if value else 'Add'}</summary>",
        f"<form method='post' action='/api/applications/{app_id}' data-write-control='inline-field'>",
        "<input type='hidden' name='_method' value='PATCH'>",
    ]
    if field in TEXTAREA_FIELDS:
        html.append(f"<textarea id='{input_id}' name='{escape(field)}' aria-label='{escape(label)}'>{escape(value)}</textarea>")
    else:
        html.append(f"<input id='{input_id}' name='{escape(field)}' aria-label='{escape(label)}' value='{escape(value)}'>")
    html.append("<button>Save</button></form></details>")
    return "".join(html)


def render_keywords_inline(selected: dict[str, Any]) -> str:
    app_id = escape(selected.get("id", ""))
    value = escape(", ".join(selected.get("keywords", [])))
    return (
        "<details class='inline-edit' data-inline-field='keywords'>"
        "<summary>Edit keywords</summary>"
        f"<form method='post' action='/api/applications/{app_id}' data-write-control='inline-field'>"
        "<input type='hidden' name='_method' value='PATCH'>"
        f"<input name='keywords' aria-label='Keywords' value='{value}' placeholder='keyword, stack, system'>"
        "<button>Save</button></form></details>"
    )


def render_keyword_panel(
    selected: dict[str, Any],
    selected_term: str,
    term_data: dict[str, Any],
    selected_queue: list[dict[str, Any]],
    mode: Mode,
) -> str:
    html = ["<section data-tab-panel='keyword'>", f"<h2>{escape(selected_term or 'Keyword')}</h2>"]
    html.append(f"<p>{escape(term_data.get('definition', '') or 'No glossary definition yet.')}</p>")
    if selected:
        html.append(f"<p class='meta'>Context: {escape(selected.get('company',''))} / {escape(selected.get('role',''))}</p>")
    keyword_queue = [item for item in selected_queue if item.get("field") == f"keyword:{selected_term}"]
    for item in keyword_queue:
        html.append(render_queue_item(item, "keyword"))
    if can_write(mode):
        html.append(
            "<details class='compact-form'><summary>Update keyword definition</summary>"
            "<form data-write-control='glossary' method='post' action='/api/glossary'>"
            f"<input name='term' placeholder='Term' required value='{escape(selected_term)}'>"
            f"<textarea name='definition' placeholder='Definition'>{escape(term_data.get('definition', ''))}</textarea>"
            f"<input name='category' placeholder='Category' value='{escape(term_data.get('category', ''))}'>"
            "<button>Save term</button></form></details>"
        )
    html.append("</section>")
    return "".join(html)


def render_company_panel(selected: dict[str, Any], payload: dict[str, Any], mode: Mode) -> str:
    html = ["<section data-tab-panel='company'><h2>Company</h2>"]
    if selected:
        for field in ("source", "source_url", "location", "remote_mode", "technical_reading", "company_research", "offer_snapshot"):
            html.append(render_inline_field(selected, field, mode))
    missing = payload.get("missing_profile_variables", [])
    html.append("<h2>Profile setup</h2>")
    html.append(f"<p class='empty'>Missing: {escape(', '.join(missing))}</p>" if missing else "<p>Profile variables ready for templates.</p>")
    if can_write(mode):
        html.append(
            "<details class='compact-form'><summary>Set profile variable</summary>"
            "<form data-write-control='profile' method='post' action='/api/profile/variables'>"
            "<input type='hidden' name='_method' value='PATCH'>"
            "<input name='key' placeholder='display_name' required>"
            "<textarea name='value' placeholder='Value'></textarea>"
            "<button>Save variable</button></form></details>"
        )
    html.append("</section>")
    return "".join(html)


def render_notes_panel(selected: dict[str, Any], mode: Mode) -> str:
    html = ["<section data-tab-panel='notes'><h2>Notes</h2>"]
    for field in ("notes", "call_signals"):
        html.append(render_inline_field(selected, field, mode))
    html.append("</section>")
    return "".join(html)


def render_queue_panel(queue_items: list[dict[str, Any]], active_tab: str) -> str:
    html = ["<section data-tab-panel='queue'><h2>Review queue</h2>"]
    if queue_items:
        for item in queue_items:
            html.append(render_queue_item(item, active_tab))
    else:
        html.append("<p class='empty'>No review queue items.</p>")
    html.append("</section>")
    return "".join(html)


def render_artifacts_panel(selected: dict[str, Any], mode: Mode) -> str:
    html = ["<section data-tab-panel='artifacts'><h2>Artifacts</h2>"]
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
        html.append(render_artifact_form(selected))
    html.append("</section>")
    return "".join(html)


def render_raw_panel(selected: dict[str, Any], mode: Mode) -> str:
    app_id = escape(selected.get("id", "")) if selected else ""
    html = ["<section data-tab-panel='raw'><h2>Raw intake</h2>"]
    for item in selected.get("raw_intake", []) if selected else []:
        html.append(f"<article><p>{escape(item.get('content',''))}</p><p class='meta'>{escape(item.get('created_by',''))} / {escape(item.get('created_at',''))}</p></article>")
    if selected and not selected.get("raw_intake"):
        html.append("<p class='empty'>No raw intake for this application.</p>")
    if can_write(mode) and selected:
        html.append(
            f"<details class='compact-form'><summary>Add raw intake note</summary><form data-write-control='raw-intake' method='post' action='/api/applications/{app_id}/raw-intake'>"
            "<textarea name='content' required></textarea><button>Add intake</button></form></details>"
        )
    html.append("</section>")
    return "".join(html)


def render_queue_item(item: dict[str, Any], active_tab: str) -> str:
    app_id = quote(str(item.get("application_id", "")))
    return (
        "<div class='queue-item' data-review-queue-item>"
        f"<a href='/?application_id={app_id}&tab={escape(active_tab)}'><b>{escape(item.get('company',''))}</b> {escape(item.get('role',''))}</a><br>"
        f"<span class='meta'>{escape(item.get('priority',''))} / {escape(item.get('category',''))} / {escape(item.get('field',''))}</span>"
        f"<p>{escape(item.get('reason',''))} {escape(item.get('recommended_action',''))}</p>"
        "</div>"
    )


def render_artifact_form(selected: dict[str, Any]) -> str:
    app_id = escape(selected.get("id", ""))
    return (
        "<details class='compact-form'><summary>Save artifact record</summary>"
        "<form data-write-control='artifact' method='post' action='/api/artifacts'>"
        f"<input type='hidden' name='application_id' value='{app_id}'>"
        "<input name='artifact_type' placeholder='cover_letter' required>"
        "<input name='path' placeholder='local path' required>"
        "<input name='label' placeholder='Label' required>"
        "<select name='review_state'><option>draft</option><option>reviewed</option><option>submitted</option><option>archived</option></select>"
        "<textarea name='notes' placeholder='Notes'></textarea>"
        "<button>Save artifact</button></form></details>"
    )


def render_artifact(artifact: dict[str, Any], writable: bool, archived: bool = False) -> str:
    class_name = "artifact archived" if archived else "artifact"
    artifact_id = escape(artifact.get("id", ""))
    html = [
        f"<div class='{class_name}'><b>{escape(artifact.get('label',''))}</b> ",
        f"<span class='meta'>{escape(artifact.get('review_state','draft'))}</span><br>",
        escape(artifact.get("path", "")),
    ]
    if writable and artifact_id:
        html.append(f"<details class='compact-form'><summary>Change review state</summary><form data-write-control='artifact-state' method='post' action='/api/artifacts/{artifact_id}'>")
        html.append("<input type='hidden' name='_method' value='PATCH'>")
        html.append("<select name='review_state'><option>draft</option><option>reviewed</option><option>submitted</option><option>archived</option></select>")
        html.append("<input name='notes' placeholder='State notes'>")
        html.append("<button>Update state</button></form></details>")
    html.append("</div>")
    return "".join(html)


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


def keyword_link(app_id: str, keyword: str, active_tab: str) -> str:
    quoted_keyword = quote(keyword)
    return f"<a class='chip' data-keyword='{escape(keyword)}' href='/?application_id={app_id}&keyword={quoted_keyword}&tab={escape(active_tab)}'>{escape(keyword)}</a>"


def display_value(app: dict[str, Any], field: str, fallback: str) -> str:
    return str(app.get(field) or fallback)


def render_value(value: Any) -> str:
    text = str(value or "")
    if not text:
        return ""
    parts: list[str] = []
    last = 0
    for match in re.finditer(r"https?://[^\s<>'\"]+", text):
        parts.append(escape(text[last : match.start()]))
        url = match.group(0)
        escaped = escape(url)
        parts.append(f"<a href='{escaped}' target='_blank' rel='noopener noreferrer'>{escaped}</a>")
        last = match.end()
    parts.append(escape(text[last:]))
    return "".join(parts)
