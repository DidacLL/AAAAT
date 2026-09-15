from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / "scripts/product-pass-apply-v1b.py"), run_name="__main__")
path = ROOT / "src/main/robust-job-extraction.ts"
text = path.read_text(encoding="utf-8")
text = text.replace(
    "sourceContext: compactSourceText(request.sourceContext),",
    "sourceText: compactSourceText(request.sourceText),",
)
path.write_text(text, encoding="utf-8")
