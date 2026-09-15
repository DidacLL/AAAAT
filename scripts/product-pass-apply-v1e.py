from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / "scripts/product-pass-apply-v1d.py"), run_name="__main__")
path = ROOT / "test/CandidatureOfferPanel.test.tsx"
text = path.read_text(encoding="utf-8").replace(
    '    expect(await screen.findByText("English required")).toBeInTheDocument();\n',
    '    expect(await screen.findByText(/English required/, { selector: "p.source-reader-content" })).toBeInTheDocument();\n',
)
path.write_text(text, encoding="utf-8")
