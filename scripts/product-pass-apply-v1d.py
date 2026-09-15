from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / "scripts/product-pass-apply-v1c.py"), run_name="__main__")
path = ROOT / "src/renderer/CandidatureOfferPanel.tsx"
text = path.read_text(encoding="utf-8").replace("    setFailed(false);\n", "")
path.write_text(text, encoding="utf-8")
