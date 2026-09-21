// @vitest-environment node

import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import {
  applicationPacketPdfPath,
  createApplicationPacket,
  createCoverLetter,
  createCvTemplate,
  createWorkingCv,
  exportApplicationPacketProject,
  exportRenderedCoverLetterProject,
  exportRenderedCvProject,
  listDocumentCollections,
  renderCoverLetter,
  renderedCoverLetterPdfPath,
  renderWorkingCv,
  updateCoverLetter,
  updateWorkingCv,
} from "../src/main/document-domain-service";
import { addProfileItem, getProfile } from "../src/main/profile-service";
import { createProfileVariant } from "../src/main/profile-variant-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "../src/main/workspace";

const temporaryRoots: string[] = [];
const originalPath = process.env.PATH;

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

function workspace(): string {
  const root = temporaryRoot("aaaat-document-production-");
  createOrOpenWorkspace(root);
  return root;
}

function installFakeLatexmk(): void {
  const root = temporaryRoot("aaaat-fake-latex-");
  const script = path.join(root, "fake-latex.js");
  writeFileSync(
    script,
    `const fs = require("node:fs");
const path = require("node:path");
if (process.env.AAAAT_FAKE_LATEX_MODE === "fail") process.exit(2);
fs.mkdirSync(path.join(process.cwd(), "build"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "build", "main.pdf"), "%PDF-1.4\\n% AAAAT test PDF\\n");
`,
    "utf8",
  );
  const executable = path.join(root, "latexmk");
  writeFileSync(executable, `#!/usr/bin/env node
require(${JSON.stringify(script)});
`, "utf8");
  chmodSync(executable, 0o755);
  writeFileSync(path.join(root, "latexmk.cmd"), `@node "${script}" %*\r\n`, "utf8");
  process.env.PATH = `${root}${path.delimiter}${originalPath ?? ""}`;
}

function projectTex(project: string): string {
  const queue = [project];
  const sources: string[] = [];
  while (queue.length > 0) {
    const directory = queue.pop();
    if (!directory) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(full);
      else if (entry.name.endsWith(".tex") || entry.name.endsWith(".sty")) {
        sources.push(readFileSync(full, "utf8"));
      }
    }
  }
  return sources.join("\n");
}

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AAAAT_FAKE_LATEX_MODE;
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("document production", () => {
  it("keeps current, variant, override and custom CV template ownership semantics explicit", () => {
    const root = workspace();
    const profileItem = addProfileItem(root, {
      kind: "experience",
      title: "Platform Engineer",
      description: "Current reusable wording.",
    }).items[0];
    if (!profileItem) throw new Error("Profile item missing");

    const variant = createProfileVariant(root, {
      itemId: profileItem.id,
      name: "Leadership",
      content: {
        title: "Platform Lead",
        description: "Saved leadership wording.",
      },
    });

    const template = createCvTemplate(root, {
      name: "Explicit source modes",
      sections: [{
        id: crypto.randomUUID(),
        name: "Experience",
        items: [
          { id: crypto.randomUUID(), sourceMode: "current", profileItemId: profileItem.id },
          {
            id: crypto.randomUUID(),
            sourceMode: "variant",
            profileItemId: profileItem.id,
            profileVariantId: variant.id,
          },
          {
            id: crypto.randomUUID(),
            sourceMode: "override",
            profileItemId: profileItem.id,
            content: {
              kind: "experience",
              title: "Template-specific engineer",
              description: "Template-only wording.",
            },
          },
          {
            id: crypto.randomUUID(),
            sourceMode: "custom",
            content: {
              kind: "experience",
              title: "Independent selected work",
              description: "No reusable source.",
            },
          },
        ],
      }],
    }).templates.find((candidate) => candidate.name === "Explicit source modes");
    if (!template) throw new Error("Template missing");

    const working = createWorkingCv(root, {
      title: "Ownership CV",
      candidatureId: null,
      source: { kind: "template", templateId: template.id },
    });
    expect(working.sections[0]?.items.map((item) => [item.sourceMode, item.content.title])).toEqual([
      ["current", "Platform Engineer"],
      ["variant", "Platform Lead"],
      ["override", "Template-specific engineer"],
      ["custom", "Independent selected work"],
    ]);
    expect(getProfile(root).items[0]?.title).toBe("Platform Engineer");
  });

  it("renders immutable CV and cover-letter snapshots without leaking internal kinds or TeX commands", async () => {
    installFakeLatexmk();
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    addProfileItem(root, {
      kind: "experience",
      title: "Àlex Núñez & Co_100% {R&D} \\input{evil}",
      subtitle: "Barcelona #1",
      description: "First line\nSecond line costs $5 ^ ~",
      url: "https://example.test/a_b?x=1&y=2",
    });

    const working = createWorkingCv(root, {
      title: "CV français & català",
      candidatureId: candidature.id,
      source: { kind: "profile" },
    });
    const renderedCv = await renderWorkingCv(root, working.id);
    const cvProject = path.join(root, "rendered-cvs", renderedCv.id);
    const cvData = readFileSync(path.join(cvProject, "data.tex"), "utf8");
    expect(cvData).toContain("\\AAAATSection{Experience}");
    expect(cvData).not.toContain("{experience}");
    expect(cvData).not.toContain("\\input{evil}");
    expect(cvData).toContain("\\AAAATLineBreak{}");
    expect(cvData).toContain("Àlex Núñez");
    expect(renderedCv.hasPdf).toBe(true);

    const section = working.sections[0];
    const item = section?.items[0];
    if (!section || !item) throw new Error("Working CV item missing");
    updateWorkingCv(root, {
      id: working.id,
      title: "Changed after rendering",
      language: working.language,
      sections: [{
        ...section,
        items: [{ ...item, content: { ...item.content, title: "Changed live content" } }],
      }],
    });
    expect(
      listDocumentCollections(root).renderedCvs.find((candidate) => candidate.id === renderedCv.id)
        ?.snapshot.title,
    ).toBe("CV français & català");

    const standalone = createCoverLetter(root, {
      candidatureId: null,
      title: "Lettre de motivation",
      language: "fr-CA",
      recipient: "Équipe R&D & opérations",
      subject: "Candidature 100% locale #1",
      bodyParagraphs: [
        "Bonjour {équipe},",
        "Je travaille avec C++ \\ commands & données_robustes.\nDeuxième ligne.",
      ],
      closing: "Cordialement ~ Àlex",
    });
    const renderedLetter = await renderCoverLetter(root, standalone.id);
    const letterProject = path.join(root, "rendered-cover-letters", renderedLetter.id);
    const letterData = readFileSync(path.join(letterProject, "data.tex"), "utf8");
    expect(letterData).not.toContain("\\ commands");
    expect(letterData).toContain("Équipe R");
    expect(letterData).toContain("\\AAAATLineBreak{}");
    expect(renderedCoverLetterPdfPath(root, renderedLetter.id)).toBe(
      path.join(letterProject, "build", "main.pdf"),
    );

    updateCoverLetter(root, {
      id: standalone.id,
      title: "Edited later",
      language: standalone.language,
      recipient: standalone.recipient,
      subject: standalone.subject,
      bodyParagraphs: ["New mutable body."],
      closing: standalone.closing,
    });
    const retained = listDocumentCollections(root).renderedLetters.find(
      (candidate) => candidate.id === renderedLetter.id,
    );
    expect(retained?.snapshot.title).toBe("Lettre de motivation");
    expect(retained?.snapshot.bodyParagraphs).toEqual([
      "Bonjour {équipe},",
      "Je travaille avec C++ \\ commands & données_robustes.\nDeuxième ligne.",
    ]);
  });

  it("retains direct cover-letter output and leaves editable state intact after a failed render", async () => {
    installFakeLatexmk();
    const root = workspace();
    const letter = createCoverLetter(root, {
      candidatureId: null,
      title: "Manual standalone letter",
      bodyParagraphs: ["Editable content remains authoritative."],
    });

    process.env.AAAAT_FAKE_LATEX_MODE = "fail";
    await expect(renderCoverLetter(root, letter.id, 1_000)).rejects.toThrow(
      "TeX rendering failed",
    );

    const collections = listDocumentCollections(root);
    expect(collections.letters.find((candidate) => candidate.id === letter.id)).toEqual(letter);
    expect(collections.renderedLetters).toEqual([]);
    const managedRoot = path.join(root, "rendered-cover-letters");
    if (existsSync(managedRoot)) expect(readdirSync(managedRoot)).toEqual([]);
  });

  it("retains an exact application packet contributor snapshot and exports self-contained projects without mutating managed originals", async () => {
    installFakeLatexmk();
    const root = workspace();
    const exportRoot = temporaryRoot("aaaat-portable-export-");
    const candidature = createCandidature(root, { values: [] });
    addProfileItem(root, {
      kind: "experience",
      title: "Ingénieure plateforme",
      description: "Fiabilité & automatisation.",
    });

    const working = createWorkingCv(root, {
      title: "Application CV",
      candidatureId: candidature.id,
      source: { kind: "profile" },
    });
    const renderedCv = await renderWorkingCv(root, working.id);
    const letter = createCoverLetter(root, {
      candidatureId: candidature.id,
      title: "Application letter",
      recipient: "Hiring team",
      subject: "Platform role",
      bodyParagraphs: ["Exact retained packet wording."],
      closing: "Regards",
    });
    const renderedLetter = await renderCoverLetter(root, letter.id);
    const packet = await createApplicationPacket(root, {
      candidatureId: candidature.id,
      renderedCvId: renderedCv.id,
      coverLetterId: letter.id,
    });

    expect(applicationPacketPdfPath(root, packet.id)).toBe(
      path.join(root, "application-packets", packet.id, "build", "main.pdf"),
    );

    updateCoverLetter(root, {
      id: letter.id,
      title: letter.title,
      language: letter.language,
      recipient: letter.recipient,
      subject: letter.subject,
      bodyParagraphs: ["Edited after packet generation."],
      closing: letter.closing,
    });
    const storedSnapshot = withWorkspaceDatabase(root, (database) => {
      const row = database.prepare(
        "SELECT letter_snapshot_json AS letterSnapshotJson FROM application_packets WHERE id = ?",
      ).get(packet.id) as { letterSnapshotJson: string };
      return JSON.parse(row.letterSnapshotJson) as { bodyParagraphs: string[] };
    });
    expect(storedSnapshot.bodyParagraphs).toEqual(["Exact retained packet wording."]);
    expect(
      readFileSync(
        path.join(root, "application-packets", packet.id, "cover-letter", "data.tex"),
        "utf8",
      ),
    ).toContain("Exact retained packet wording.");

    const exportedCv = exportRenderedCvProject(root, renderedCv.id, exportRoot);
    const exportedLetter = exportRenderedCoverLetterProject(root, renderedLetter.id, exportRoot);
    const exportedPacket = exportApplicationPacketProject(root, packet.id, exportRoot);

    for (const project of [exportedCv, exportedLetter]) {
      expect(existsSync(path.join(project, "main.tex"))).toBe(true);
      expect(existsSync(path.join(project, "data.tex"))).toBe(true);
      expect(existsSync(path.join(project, "aaaat.sty"))).toBe(true);
      expect(projectTex(project)).not.toContain(root);
    }
    expect(existsSync(path.join(exportedPacket, "main.tex"))).toBe(true);
    expect(existsSync(path.join(exportedPacket, "cv", "main.tex"))).toBe(true);
    expect(existsSync(path.join(exportedPacket, "cv", "aaaat.sty"))).toBe(true);
    expect(existsSync(path.join(exportedPacket, "cover-letter", "main.tex"))).toBe(true);
    expect(existsSync(path.join(exportedPacket, "cover-letter", "aaaat.sty"))).toBe(true);
    expect(projectTex(exportedPacket)).not.toContain(root);

    expect(existsSync(path.join(root, "rendered-cvs", renderedCv.id, "data.tex"))).toBe(true);
    expect(existsSync(path.join(root, "rendered-cover-letters", renderedLetter.id, "data.tex"))).toBe(true);
    expect(existsSync(path.join(root, "application-packets", packet.id, "main.tex"))).toBe(true);
  });
});
