from __future__ import annotations

from collections import defaultdict
from html import escape
from typing import Any

from .security import Mode, can_show_raw_intake, can_write


def render_dashboard(payload: dict[str, Any], mode: Mode | str = Mode.FULL) -> str:
    mode = Mode(mode)
    apps = payload.get("applications", [])
    glossary = payload.get("glossary", [])
    selected = apps[0] if apps else {}
    selected_term = selected.get("keywords", [glossary[0]["term"] if glossary else ""])[0] if (selected or glossary) else ""
    term_data = next((term for term in glossary if term.get("term") == selected_term), glossary[0] if glossary else {})
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for app in apps:
        grouped[app.get("status") or "draft"].append(app)

    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>AAAAT</title>",
        "<style>",
        "body{font-family:Arial,sans-serif;margin:0;background:#f6f7f9;color:#18212f}header,.toolbar{padding:14px 18px;background:#fff;border-bottom:1px solid #d8dee8}",
        "main{display:grid;grid-template-columns:1.4fr 1fr .8fr;gap:14px;padding:14px}.column,.panel{background:#fff;border:1px solid #d8dee8;border-radius:6px;padding:12px}",
        ".board{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.card{border:1px solid #d8dee8;border-radius:6px;padding:10px;margin:8px 0}.chip{display:inline-block;border:1px solid #91a4bc;border-radius:999px;padding:2px 7px;margin:2px;background:#eef3f8}.state{font-size:12px;color:#53657a}.art{border-top:1px solid #e6ebf1;padding-top:6px;margin-top:6px}",
        "textarea,input{width:100%;box-sizing:border-box;margin:4px 0 8px;padding:7px}button{padding:7px 10px}",
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
            html.append(f"<strong>{escape(app.get('company',''))}</strong><br>")
            html.append(f"<span>{escape(app.get('role',''))}</span>")
            html.append(f"<p>Priority: {escape(app.get('priority','normal'))}</p>")
            html.append(f"<p>Next: {escape(app.get('next_action',''))}</p>")
            html.append("".join(f"<button class='chip' data-keyword='{escape(k)}'>{escape(k)}</button>" for k in app.get("keywords", [])))
            html.append("</article>")
        html.append("</div>")
    html.append("</div></section>")

    html.append("<section class='panel'><h2>Application Detail</h2>")
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
    for label, key in detail_fields:
        html.append(f"<p><b>{label}:</b> {escape(str(selected.get(key, '')))}</p>")
    html.append("<h3>Call Card</h3>")
    html.append(f"<p>{escape(str(selected.get('pitch', '')))}</p>")
    html.append("<h3>Generated Artifacts</h3>")
    for artifact in selected.get("artifacts", []):
        html.append(f"<div class='art'><b>{escape(artifact.get('label',''))}</b> <span class='state'>{escape(artifact.get('review_state','draft'))}</span><br>{escape(artifact.get('path',''))}</div>")
    if can_show_raw_intake(mode):
        html.append("<section data-write-control='raw-intake'><h3>Raw intake</h3><textarea name='raw_intake'></textarea><button>Add intake</button></section>")
    if can_write(mode):
        html.append("<button data-write-control='save'>Save draft</button>")
    html.append("</section>")

    html.append("<aside class='panel'><h2>Glossary</h2>")
    html.append(f"<h3>{escape(term_data.get('term', selected_term))}</h3>")
    html.append(f"<p>{escape(term_data.get('definition', ''))}</p>")
    html.append("<h2>Review State</h2><p>draft / reviewed / submitted</p>")
    html.append("</aside></main></body></html>")
    return "".join(html)
