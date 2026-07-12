from __future__ import annotations

from pathlib import Path
from typing import Any

from . import artifacts
from .templates import compile_pdf_with_pdflatex, context_for_application, render_string
from .workspace_config import load_template


def render_workspace_artifact(
    conn,
    storage_path: str | Path,
    template_name: str,
    output_path: str | Path,
    application_id: str | None,
    extra: dict[str, Any],
    *,
    compile_pdf: bool = False,
    save_version: bool = False,
) -> dict[str, Any]:
    template = load_template(storage_path, template_name)
    values = context_for_application(conn, application_id, extra)
    rendered = render_string(template, values)
    tex_path = Path(output_path)
    tex_path.parent.mkdir(parents=True, exist_ok=True)
    tex_path.write_text(rendered, encoding="utf-8")

    artifact_path = tex_path
    pdf_status = "not_requested"
    pdf_path = None
    log_path = None
    notes = "Rendered local workspace template."
    if compile_pdf:
        compiled = compile_pdf_with_pdflatex(tex_path)
        pdf_status = compiled["pdf_status"]
        pdf_path = compiled["pdf_path"]
        log_path = compiled["log_path"]
        if pdf_status == "success" and pdf_path:
            artifact_path = Path(pdf_path)
            notes = "Rendered local workspace template and compiled with pdflatex."
        else:
            notes = f"Rendered local workspace template; PDF status: {pdf_status}."

    artifact = artifacts.save_or_update_draft_artifact(
        conn,
        application_id,
        "cv" if template_name == "cv" else "cover_letter",
        str(artifact_path),
        f"{template_name} local render",
        source_context=f"workspace-template:{template_name}",
        notes=notes,
        save_version=save_version,
    )
    return {
        "artifact": artifact,
        "artifact_id": artifact["id"],
        "artifact_type": artifact["artifact_type"],
        "path": artifact["path"],
        "tex_path": str(tex_path),
        "pdf_path": pdf_path,
        "pdf_status": pdf_status,
        "log_path": log_path,
    }
