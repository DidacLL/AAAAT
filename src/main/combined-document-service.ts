import { randomUUID } from "node:crypto";
import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  combinedDocumentExportInputSchema,
  type CombinedDocumentExportInput,
} from "../shared/combined-document-contracts";
import type { DocumentRecord } from "../shared/contracts";
import { getDocument, renderDocument } from "./document-service";
import { LatexRunnerError, runLatexmk } from "./latex-runner";

class CombinedDocumentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CombinedDocumentServiceError";
  }
}

const combinedTemplate = String.raw`\documentclass{article}
\usepackage{graphicx}
\pagestyle{empty}
\setlength{\oddsidemargin}{-1in}
\setlength{\evensidemargin}{-1in}
\setlength{\topmargin}{-1in}
\setlength{\headheight}{0pt}
\setlength{\headsep}{0pt}
\setlength{\footskip}{0pt}
\setlength{\textwidth}{\paperwidth}
\setlength{\textheight}{\paperheight}
\setlength{\topskip}{0pt}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\newcount\AAAATPage
\newcount\AAAATPageCount
\newcommand{\AAAATIncludePDF}[1]{%
  \pdfximage{#1}%
  \AAAATPageCount=\pdflastximagepages
  \AAAATPage=1
  \AAAATIncludePDFPage{#1}%
}
\newcommand{\AAAATIncludePDFPage}[1]{%
  \vbox to \textheight{%
    \vfil
    \hbox to \textwidth{%
      \hfil\includegraphics[page=\the\AAAATPage,width=\textwidth,height=\textheight,keepaspectratio]{#1}\hfil
    }%
    \vfil
  }%
  \ifnum\AAAATPage<\AAAATPageCount
    \newpage
    \advance\AAAATPage by 1
    \expandafter\AAAATIncludePDFPage\expandafter{#1}%
  \fi
}
\begin{document}
\AAAATIncludePDF{cover-letter/build/main.pdf}
\newpage
\AAAATIncludePDF{cv/build/main.pdf}
\end{document}
`;

function requireKinds(
  rootPath: string,
  input: CombinedDocumentExportInput,
): { readonly cv: DocumentRecord; readonly coverLetter: DocumentRecord } {
  const cv = getDocument(rootPath, input.cvDocumentId);
  const coverLetter = getDocument(rootPath, input.coverLetterDocumentId);
  if (cv.kind !== "cv") {
    throw new CombinedDocumentServiceError("The selected CV document is not a CV.");
  }
  if (coverLetter.kind !== "cover_letter") {
    throw new CombinedDocumentServiceError(
      "The selected cover-letter document is not a cover letter.",
    );
  }
  return { cv, coverLetter };
}

function assertWritableDirectory(targetParent: string): void {
  try {
    if (!statSync(targetParent).isDirectory()) throw new Error("not directory");
    accessSync(targetParent, constants.R_OK | constants.W_OK);
  } catch {
    throw new CombinedDocumentServiceError("The selected export folder is not writable.");
  }
}

function destinationName(input: CombinedDocumentExportInput): string {
  return `application-packet-${input.coverLetterDocumentId.slice(0, 8)}-${input.cvDocumentId.slice(0, 8)}`;
}

function assertRendered(document: DocumentRecord): void {
  if (!existsSync(document.sourcePath) || !existsSync(document.artifactPath)) {
    throw new CombinedDocumentServiceError(
      `The ${document.kind === "cv" ? "CV" : "cover letter"} did not produce complete source and PDF output.`,
    );
  }
}

export async function exportCombinedDocumentProject(
  rootPath: string,
  rawInput: CombinedDocumentExportInput,
  targetParent: string,
  timeoutMs = 30_000,
): Promise<string> {
  const input = combinedDocumentExportInputSchema.parse(rawInput);
  requireKinds(rootPath, input);
  assertWritableDirectory(targetParent);

  const destination = path.join(targetParent, destinationName(input));
  if (existsSync(destination)) {
    throw new CombinedDocumentServiceError(
      "A combined application packet for those documents already exists in the selected folder.",
    );
  }

  const coverLetter = await renderDocument(rootPath, input.coverLetterDocumentId, timeoutMs);
  const cv = await renderDocument(rootPath, input.cvDocumentId, timeoutMs);
  assertRendered(coverLetter);
  assertRendered(cv);

  const stagePath = path.join(targetParent, `.aaaat-combined-stage-${randomUUID()}`);
  try {
    mkdirSync(stagePath);
    cpSync(coverLetter.projectPath, path.join(stagePath, "cover-letter"), {
      recursive: true,
      errorOnExist: true,
    });
    cpSync(cv.projectPath, path.join(stagePath, "cv"), {
      recursive: true,
      errorOnExist: true,
    });
    writeFileSync(path.join(stagePath, "main.tex"), combinedTemplate, "utf8");

    try {
      await runLatexmk(stagePath, timeoutMs);
    } catch (error) {
      if (error instanceof LatexRunnerError) {
        throw new CombinedDocumentServiceError(
          `${error.message} AAAAT could not render the combined application packet.`,
        );
      }
      throw error;
    }

    if (!existsSync(path.join(stagePath, "build", "main.pdf"))) {
      throw new CombinedDocumentServiceError(
        "TeX rendering did not produce the combined application packet PDF.",
      );
    }

    renameSync(stagePath, destination);
    return destination;
  } catch (error) {
    rmSync(stagePath, { recursive: true, force: true });
    throw error;
  }
}
