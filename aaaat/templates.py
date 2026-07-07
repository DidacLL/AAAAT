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
TRUSTED_TEX_KEYS = {"artifact.cover_letter.body_tex"}
LOG_LIMIT = 40000


class TemplateVariableError(ValueError):
    pass


def escape_latex(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in str(value))


def tex_value(key: str, value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    if key in TRUSTED_TEX_KEYS:
        return text
    return escape_latex(text)


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
    for key, value in resolve_variables(conn, "local_render").items():
        values[key] = tex_value(key, value)
    if application_id:
        app = get_application(conn, application_id)
        for key, value in app.items():
            if not isinstance(value, list):
                tex_key = f"application.{key}"
                values[tex_key] = tex_value(tex_key, value)
        values["application.keywords"] = tex_value("application.keywords", ", ".join(app.get("keywords", [])))
    for key, value in (extra or {}).items():
        values[key] = tex_value(key, value)
        if key == "artifact.cover_letter.body_tex":
            values["artifact.cover_letter.body"] = values[key]
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
    tex_path = render_tex_to_file(conn, name, output_path, application_id, extra)
    return artifacts.save_or_update_draft_artifact(
        conn,
        application_id,
        "cv" if name == "cv" else "cover_letter",
        str(tex_path),
        f"{name} render",
        source_context=f"template:{name}",
        notes="Rendered local TeX template.",
    )


def render_tex_to_file(
    conn: sqlite3.Connection,
    name: str,
    output_path: str | Path,
    application_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> Path:
    rendered = render_named_template(conn, name, application_id, extra)
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered, encoding="utf-8")
    return target


def storage_artifact_root(storage_path: str | Path, application_id: str | None) -> Path:
    base = Path(storage_path)
    if base.suffix:
        base = base.parent
    return base / "artifacts" / (application_id or "unscoped")


def safe_artifact_output_path(
    storage_path: str | Path,
    application_id: str | None,
    name: str,
    requested_path: str | Path | None = None,
) -> Path:
    root = storage_artifact_root(storage_path, application_id).resolve()
    target = root / f"{name}.tex" if not requested_path else Path(requested_path)
    if not target.is_absolute():
        target = root / target
    resolved = target.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError("Artifact output path must stay under the local artifact directory") from exc
    if resolved.suffix.lower() != ".tex":
        raise ValueError("Rendered document output path must end with .tex")
    return resolved


def compile_pdf_with_pdflatex(tex_path: str | Path, *, timeout: int = 30) -> dict[str, Any]:
    tex = Path(tex_path)
    pdf_path = tex.with_suffix(".pdf")
    log_path = tex.with_suffix(".pdflatex.log")
    if not shutil.which("pdflatex"):
        return {"pdf_status": "unavailable", "pdf_path": None, "log_path": None}
    try:
        result = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex.name],
            cwd=tex.parent,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
        )
        log_text = ((result.stdout or "") + "\n" + (result.stderr or ""))[-LOG_LIMIT:]
        log_path.write_text(log_text, encoding="utf-8")
        if result.returncode == 0 and pdf_path.exists():
            return {"pdf_status": "success", "pdf_path": str(pdf_path), "log_path": str(log_path)}
        return {"pdf_status": "failed", "pdf_path": None, "log_path": str(log_path)}
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        log_path.write_text((stdout + "\n" + stderr)[-LOG_LIMIT:], encoding="utf-8")
        return {"pdf_status": "timeout", "pdf_path": None, "log_path": str(log_path)}


def render_document_artifact(
    conn: sqlite3.Connection,
    name: str,
    output_path: str | Path,
    application_id: str | None = None,
    extra: dict[str, Any] | None = None,
    *,
    compile_pdf: bool = False,
    save_version: bool = False,
) -> dict[str, Any]:
    tex_path = render_tex_to_file(conn, name, output_path, application_id, extra)
    artifact_path = tex_path
    pdf_status = "not_requested"
    pdf_path: str | None = None
    log_path: str | None = None
    notes = "Rendered local TeX template."
    if compile_pdf:
        compile_result = compile_pdf_with_pdflatex(tex_path)
        pdf_status = compile_result["pdf_status"]
        pdf_path = compile_result["pdf_path"]
        log_path = compile_result["log_path"]
        if pdf_status == "success" and pdf_path:
            artifact_path = Path(pdf_path)
            notes = "Rendered local TeX template and compiled with pdflatex."
        elif pdf_status == "unavailable":
            notes = "Rendered local TeX template; pdflatex unavailable, keeping TeX artifact."
        elif pdf_status == "timeout":
            notes = "Rendered local TeX template; pdflatex timed out, keeping TeX artifact."
        else:
            notes = "Rendered local TeX template; pdflatex failed, keeping TeX artifact."
    artifact = artifacts.save_or_update_draft_artifact(
        conn,
        application_id,
        "cv" if name == "cv" else "cover_letter",
        str(artifact_path),
        f"{name} local render",
        source_context=f"template:{name}",
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
