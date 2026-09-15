from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / "scripts/product-pass-acceptance-v3.py"), run_name="__main__")

# Keep compact task-local references while satisfying the shared protocol namespace.
robust_path = ROOT / "src/main/robust-job-extraction.ts"
robust = robust_path.read_text(encoding="utf-8")
robust = robust.replace('    const fieldRef = `f${index + 1}`;\n', '    const fieldRef = `aaaat_f${index + 1}`;\n', 1)
robust = robust.replace('      const choiceRef = `c${choiceIndex + 1}`;\n', '      const choiceRef = `${fieldRef}_c${choiceIndex + 1}`;\n', 1)
robust_path.write_text(robust, encoding="utf-8")

path = ROOT / "test/robust-job-extraction.test.ts"
text = path.read_text(encoding="utf-8")
old = "    expect(payload?.fields).toEqual([\n"
new = "    expect((payload as unknown as { fields: unknown[] }).fields).toEqual([\n"
if old not in text:
    raise RuntimeError("Targeted payload assertion anchor missing")
text = text.replace(old, new, 1)
text = text.replace('fieldRef: "f1"', 'fieldRef: "aaaat_f1"')
path.write_text(text, encoding="utf-8")

packaged_path = ROOT / "test/desktop/packaged-app.spec.ts"
packaged = packaged_path.read_text(encoding="utf-8")
start = packaged.find("function chooseLinuxDirectory(): void {")
end = packaged.find("function chooseLinuxDemoDirectory(): void {")
if start < 0 or end < 0 or end <= start:
    raise RuntimeError("Packaged chooser helper anchors missing")
packaged_path.write_text(packaged[:start] + packaged[end:], encoding="utf-8")
