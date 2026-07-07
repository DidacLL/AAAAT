from __future__ import annotations

import re
import sqlite3
import shutil
import subprocess
from pathlib import Path
from typing import Any

from . import artifacts
from .db import get_application, get_template
from .privacy import resolve_variables


VARIABLE_RE = re.compile(r"{{\s*([a-zA-Z0-9_.-]+)\s*}}")


class TemplateVariableError(ValueError):
    pass


def render_string(template: str, values: dict[str, Any], required: list[str] | None = None) -> str:
    required = required or sorted(set(VARIABLE_RE.findall(template)))
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise TemplateVariableError("Missing required template variables: " + ", ".join(missing))

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return str(values.get(key, ""))

    return VARIABLE_RE.sub(replace, template)


def context_for_application(conn: sqlite3.Connection, application_id: str | None = None, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    values: dict[str, Any] = {}
    values.update(resolve_variables(conn, "local_render"))
    if application_id:
        app = get_application(conn, application_id)
        for key, value in app.items():
            if not isinstance(value, list):
                values[f"application.{key}"] = value
        values["application.keywords"] = ", ".join(app.get("keywords", []))
    for key, value in (extra or {}).items():
        values[key] = value
    return values


def render_named_template(
    conn: sqlite3.Connection,
    name: str,
    application_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    template = get_template(conn, name)
    values = context_for_application(conn, application_id, extra)
    return render_string(template["body"], values, template["required_variables"])


def render_to_file(
    conn: sqlite3.Connection,
    name: str,
    output_path: str | Path,
    application_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rendered = render_named_template(conn, name, application_id, extra)
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered, encoding="utf-8")
    return artifacts.save_artifact(
        conn,
        application_id,
        "cv" if name == "cv" else "cover_letter",
        str(target),
        f"{name} render",
        source_context=f"template:{name}",
        review_state="draft",
    )


def render_document_artifact(
    conn: sqlite3.Connection,
    name: str,
    output_path: str | Path,
    application_id: str | None = None,
    extra: dict[str, Any] | None = None,
    *,
    compile_pdf: bool = False,
) -> dict[str, Any]:
    rendered = render_named_template(conn, name, application_id, extra)
    tex_path = Path(output_path)
    tex_path.parent.mkdir(parents=True, exist_ok=True)
    tex_path.write_text(rendered, encoding="utf-8")
    artifact_path = tex_path
    notes = "Rendered local TeX template."
    if compile_pdf:
        if shutil.which("pdflatex"):
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex_path.name],
                cwd=tex_path.parent,
                capture_output=True,
                text=True,
                check=False,
            )
            pdf_path = tex_path.with_suffix(".pdf")
            if result.returncode == 0 and pdf_path.exists():
                artifact_path = pdf_path
                notes = "Rendered local TeX template and compiled with pdflatex."
            else:
                notes = "Rendered local TeX template; pdflatex failed, keeping TeX artifact."
        else:
            notes = "Rendered local TeX template; pdflatex unavailable, keeping TeX artifact."
    return artifacts.save_artifact(
        conn,
        application_id,
        "cv" if name == "cv" else "cover_letter",
        str(artifact_path),
        f"{name} local render",
        source_context=f"template:{name}",
        review_state="draft",
        notes=notes,
    )
