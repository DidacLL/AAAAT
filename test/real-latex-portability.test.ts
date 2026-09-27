// @vitest-environment node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import { BUILTIN_BLUEPRINT_SOURCE } from "../src/main/document-blueprints";
import {
  createApplicationPacket,
  createCoverLetter,
  createWorkingCv,
  exportApplicationPacketProject,
  exportRenderedCoverLetterProject,
  exportRenderedCvProject,
  renderCoverLetter,
  renderWorkingCv,
} from "../src/main/document-domain-service";
import { writeCvLatexProject } from "../src/main/document-latex";
import { runLatexmk } from "../src/main/latex-runner";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import type { WorkingCvRecord } from "../src/shared/document-domain-contracts";

const realLatexIt = process.env.AAAAT_REAL_LATEX === "1" ? it : it.skip;

function allSourceText(project: string): string {
  const names = [
    "main.tex",
    "blueprint.tex",
    "data.tex",
    "aaaat.sty",
    path.join("cv", "main.tex"),
    path.join("cv", "blueprint.tex"),
    path.join("cv", "data.tex"),
    path.join("cv", "aaaat.sty"),
    path.join("cover-letter", "main.tex"),
    path.join("cover-letter", "blueprint.tex"),
    path.join("cover-letter", "data.tex"),
    path.join("cover-letter", "aaaat.sty"),
  ];
  return names
    .map((name) => path.join(project, name))
    .filter(existsSync)
    .map((name) => readFileSync(name, "utf8"))
    .join("\n");
}

function extractedPdfText(pdfPath: string): string {
  const result = spawnSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pdftotext failed with exit code ${result.status ?? "unknown"}: ${result.stderr}`);
  }
  return result.stdout;
}

function longWorkingCv(): { working: WorkingCvRecord; entryMarkers: string[]; sectionNames: string[] } {
  const now = new Date().toISOString();
  const sectionNames = [
    "SectionA",
    "SectionB",
    "SectionC",
    "SectionD",
    "SectionE",
    "SectionF",
    "SectionG",
  ];
  const entriesPerSection = [6, 6, 5, 5, 5, 5, 5];
  const entryMarkers: string[] = [];
  let entryNumber = 0;

  const sections = sectionNames.map((name, sectionIndex) => ({
    id: crypto.randomUUID(),
    name,
    presentationRole: sectionIndex >= 5 ? "secondary" as const : "main" as const,
    items: Array.from({ length: entriesPerSection[sectionIndex] ?? 0 }, (_, itemIndex) => {
      entryNumber += 1;
      const marker = `ENTRY${String(entryNumber).padStart(2, "0")}MARKER`;
      entryMarkers.push(marker);
      return {
        id: crypto.randomUUID(),
        templateItemId: null,
        sourceMode: "custom" as const,
        profileItemId: null,
        profileVariantId: null,
        content: {
          kind: `section-${sectionIndex + 1}`,
          title: marker,
          subtitle: `Context ${sectionIndex + 1}.${itemIndex + 1}`,
          startDate: "2021",
          endDate: "2026",
          description:
            "Delivered a realistic body of work across planning, implementation, testing, documentation, stakeholder coordination and operational follow-through. " +
            "This deliberately long fixture exercises normal paragraph wrapping and enough cumulative vertical content to require safe pagination across several pages.",
          url: `https://example.test/work/${sectionIndex + 1}/${itemIndex + 1}`,
        },
      };
    }),
  }));

  return {
    working: {
      id: crypto.randomUUID(),
      title: "Long portable CV",
      language: "en-GB",
      sourceTemplateId: null,
      candidatureId: null,
      sections,
      createdAt: now,
      updatedAt: now,
    },
    entryMarkers,
    sectionNames,
  };
}

describe("real pdfLaTeX portability boundary", () => {
  realLatexIt(
    "compiles exported CV, standalone letter, candidature letter and application packet outside the workspace",
    async () => {
      const root = mkdtempSync(path.join(tmpdir(), "aaaat-real-latex-workspace-"));
      const exportParent = mkdtempSync(path.join(tmpdir(), "aaaat-real-latex-export-"));
      try {
        createOrOpenWorkspace(root);
        const candidature = createCandidature(root, { values: [] });
        addProfileItem(root, {
          kind: "experience",
          title: "Développeuse R&D — Núria Müller",
          subtitle: "Barcelona & Zürich",
          description:
            "Conçu des systèmes C++/TypeScript à 100% fiables. Budget $5k; clés {A_B}; #qualité.\nCollaboration français/català/deutsch.",
          startDate: "2022",
          endDate: "2026",
          url: "https://example.test/nuria_muller?area=r&d",
        });
        addProfileItem(root, {
          kind: "skill",
          title: "TeX \\ sécurité ^ ~",
          description: "Texte retenu; aucune commande utilisateur ne doit s'exécuter.",
        });

        const working = createWorkingCv(root, {
          title: "CV — Núria Müller",
          language: "ca-ES / fr-FR",
          candidatureId: candidature.id,
          source: { kind: "profile" },
        });
        const renderedCv = await renderWorkingCv(
          root,
          working.id,
          BUILTIN_BLUEPRINT_SOURCE,
          60_000,
        );

        const standaloneLetter = createCoverLetter(root, {
          candidatureId: null,
          title: "Lettre autonome — Élise",
          language: "fr-FR",
          recipient: "Équipe R&D {Europe}",
          subject: "Candidature 100% locale & sûre",
          bodyParagraphs: [
            "Bonjour,",
            "Je travaille avec C++ & TypeScript, données_robustes, budgets $5k et caractères # % ^ ~ \\ sans injection.",
            "Deux lignes autorisées:\nla seconde reste du texte.",
          ],
          closing: "Cordialement, Élise",
        });
        const renderedStandaloneLetter = await renderCoverLetter(
          root,
          standaloneLetter.id,
          BUILTIN_BLUEPRINT_SOURCE,
          60_000,
        );

        const applicationLetter = createCoverLetter(root, {
          candidatureId: candidature.id,
          title: "Carta de presentació — Núria",
          language: "ca-ES",
          recipient: "Equip de selecció",
          subject: "R+D & plataforma",
          bodyParagraphs: [
            "Bon dia,",
            "M'interessa la posició perquè combina R+D, fiabilitat i col·laboració internacional.",
          ],
          closing: "Atentament, Núria",
        });
        const renderedApplicationLetter = await renderCoverLetter(
          root,
          applicationLetter.id,
          BUILTIN_BLUEPRINT_SOURCE,
          60_000,
        );

        const packet = await createApplicationPacket(
          root,
          {
            candidatureId: candidature.id,
            renderedCvId: renderedCv.id,
            coverLetterId: applicationLetter.id,
            title: "Paquet de candidatura — Núria",
          },
          60_000,
        );

        const exportedCv = exportRenderedCvProject(root, renderedCv.id, exportParent);
        const exportedStandaloneLetter = exportRenderedCoverLetterProject(
          root,
          renderedStandaloneLetter.id,
          exportParent,
        );
        const exportedApplicationLetter = exportRenderedCoverLetterProject(
          root,
          renderedApplicationLetter.id,
          exportParent,
        );
        const exportedPacket = exportApplicationPacketProject(root, packet.id, exportParent);

        for (const project of [
          exportedCv,
          exportedStandaloneLetter,
          exportedApplicationLetter,
          exportedPacket,
        ]) {
          expect(allSourceText(project)).not.toContain(root);
        }

        rmSync(root, { recursive: true, force: true });

        for (const project of [
          exportedCv,
          exportedStandaloneLetter,
          exportedApplicationLetter,
          exportedPacket,
        ]) {
          rmSync(path.join(project, "build"), { recursive: true, force: true });
          await runLatexmk(project, 60_000);
          expect(existsSync(path.join(project, "build", "main.pdf"))).toBe(true);
        }

        expect(allSourceText(exportedCv)).toContain("Núria Müller");
        expect(allSourceText(exportedStandaloneLetter)).toContain("Équipe R");
        expect(allSourceText(exportedApplicationLetter)).toContain("presentació");
        expect(existsSync(path.join(exportedPacket, "cv", "blueprint.tex"))).toBe(true);
        expect(existsSync(path.join(exportedPacket, "cover-letter", "blueprint.tex"))).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(exportParent, { recursive: true, force: true });
      }
    },
    180_000,
  );

  realLatexIt(
    "paginates a realistic long CV with main and secondary sections without losing content",
    async () => {
      const project = mkdtempSync(path.join(tmpdir(), "aaaat-real-latex-long-cv-"));
      try {
        const { working, entryMarkers, sectionNames } = longWorkingCv();
        expect(entryMarkers).toHaveLength(37);
        expect(sectionNames).toHaveLength(7);
        expect(working.sections.filter((section) => section.presentationRole === "main")).toHaveLength(5);
        expect(working.sections.filter((section) => section.presentationRole === "secondary")).toHaveLength(2);
        writeCvLatexProject(project, working, BUILTIN_BLUEPRINT_SOURCE);

        await runLatexmk(project, 60_000);

        const log = readFileSync(path.join(project, "build", "main.log"), "utf8");
        expect(log).not.toMatch(/Overfull \\vbox/u);

        const pageCountMatch = log.match(/Output written on .+ \((\d+) pages?,/u);
        expect(pageCountMatch).not.toBeNull();
        expect(Number(pageCountMatch?.[1] ?? "0")).toBeGreaterThan(1);

        const text = extractedPdfText(path.join(project, "build", "main.pdf"));
        for (const sectionName of sectionNames) expect(text).toContain(sectionName);
        for (const marker of entryMarkers) expect(text).toContain(marker);

        const firstPageText = text.split("\f")[0] ?? "";
        expect(firstPageText).toContain(working.title);
        expect(
          [...sectionNames, ...entryMarkers].some((bodyMarker) => firstPageText.includes(bodyMarker)),
        ).toBe(true);
      } finally {
        rmSync(project, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
