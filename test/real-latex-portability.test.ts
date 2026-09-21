// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
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
import { runLatexmk } from "../src/main/latex-runner";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const realLatexIt = process.env.AAAAT_REAL_LATEX === "1" ? it : it.skip;

function allSourceText(project: string): string {
  const names = [
    "main.tex",
    "data.tex",
    "aaaat.sty",
    path.join("cv", "main.tex"),
    path.join("cv", "data.tex"),
    path.join("cv", "aaaat.sty"),
    path.join("cover-letter", "main.tex"),
    path.join("cover-letter", "data.tex"),
    path.join("cover-letter", "aaaat.sty"),
  ];
  return names
    .map((name) => path.join(project, name))
    .filter(existsSync)
    .map((name) => readFileSync(name, "utf8"))
    .join("\n");
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
        const renderedCv = await renderWorkingCv(root, working.id, 60_000);

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
        expect(existsSync(path.join(exportedPacket, "cv", "aaaat.sty"))).toBe(true);
        expect(existsSync(path.join(exportedPacket, "cover-letter", "aaaat.sty"))).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(exportParent, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
