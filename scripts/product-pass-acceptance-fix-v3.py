from pathlib import Path

path = Path(__file__).resolve().parents[1] / "test/robust-job-extraction.test.ts"
text = path.read_text(encoding="utf-8")
old = '''    let payload: { fields: Array<{ fieldRef: string; label: string; description: string; cardinality: string }> } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        payload = JSON.parse(body.messages.find((message) => message.role === "user")?.content ?? "{}") as typeof payload;
        return new Response(
'''
new = '''    let payloadFields: Array<{ fieldRef: string; label: string; description: string; cardinality: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        const payload = JSON.parse(
          body.messages.find((message) => message.role === "user")?.content ?? "{}",
        ) as { fields: typeof payloadFields };
        payloadFields = payload.fields;
        return new Response(
'''
if old not in text:
    raise RuntimeError("Acceptance payload capture block not found")
text = text.replace(old, new, 1)
text = text.replace("    expect(payload?.fields).toEqual([", "    expect(payloadFields).toEqual([", 1)
text = text.replace('    expect(JSON.stringify(payload)).not.toContain("Unrelated notice period");', '    expect(JSON.stringify(payloadFields)).not.toContain("Unrelated notice period");', 1)
text = text.replace("    expect(JSON.stringify(payload)).not.toContain(target.definition.id);", "    expect(JSON.stringify(payloadFields)).not.toContain(target.definition.id);", 1)
path.write_text(text, encoding="utf-8")
