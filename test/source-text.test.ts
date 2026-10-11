import { describe, expect, it } from "vitest";
import { compactSourceText, readableSourceText } from "../src/shared/source-text";

describe("Source text projections", () => {
  it("derives readable text without mutating retained raw Source", () => {
    const raw = "<h1>Backend Engineer</h1>\n<div>Build APIs &amp; tools.</div>\n\n<div>Remote: Spain</div>";
    const retained = raw;
    expect(readableSourceText(raw)).toBe("Backend Engineer\n\nBuild APIs & tools.\n\nRemote: Spain");
    expect(raw).toBe(retained);
  });

  it("compacts deterministic chrome and repeated fragments", () => {
    const raw = "<nav>Navigation</nav>\n<p>English required</p>\n<p>English required</p>\nAccept all cookies\nSalary: €55,000\nhttps://example.test/jobs/42";
    expect(compactSourceText(raw)).toBe("English required\nSalary: €55,000\nhttps://example.test/jobs/42");
    expect(compactSourceText(raw)).toBe(compactSourceText(raw));
  });
});
