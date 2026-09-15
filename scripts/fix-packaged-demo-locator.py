from pathlib import Path

path = Path(__file__).resolve().parents[1] / "test/desktop/packaged-app.spec.ts"
text = path.read_text(encoding="utf-8")
old = '.filter({ hasText: "Cover letter draft" })'
new = '.filter({ hasText: "Cover-letter drafting" })'
if old not in text:
    raise RuntimeError("stale cover-letter prompt locator not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
