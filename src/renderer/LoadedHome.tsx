import { useEffect, useMemo, useState } from "react";

import type { CandidatureFieldConfiguration, CandidatureRecord } from "../shared/contracts";
import type { DocumentCollections } from "../shared/document-domain-contracts";
import logo from "./assets/aaaat-logo-light.png";
import { candidatureRecognitionCues } from "./candidature-projections";
import "./loaded-home.css";

const emptyCollections: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

interface LoadedHomeProps {
  readonly workspaceName: string;
  readonly demoWorkspace: boolean;
  readonly onOpenApplication: (candidatureId: string) => void;
  readonly onOpenDocument: (documentId: string) => void;
  readonly onOpenApplications: () => void;
  readonly onOpenDocuments: () => void;
}

interface HomeData {
  readonly candidatures: CandidatureRecord[];
  readonly fields: CandidatureFieldConfiguration[];
  readonly documents: DocumentCollections;
}

function recentFirst<T extends { readonly updatedAt: string }>(items: readonly T[], limit: number): T[] {
  return [...items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}

function retainedSourceExcerpt(record: CandidatureRecord): string | null {
  const compact = record.sourceSearchText.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > 120 ? `${compact.slice(0, 117).trimEnd()}…` : compact;
}

export function LoadedHome({
  workspaceName,
  demoWorkspace,
  onOpenApplication,
  onOpenDocument,
  onOpenApplications,
  onOpenDocuments,
}: LoadedHomeProps) {
  const [data, setData] = useState<HomeData>({ candidatures: [], fields: [], documents: emptyCollections });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.documentDomain.collections(),
    ])
      .then(([candidatures, fields, documents]) => {
        if (!active) return;
        setData({ candidatures, fields, documents });
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const recentApplications = useMemo(
    () => recentFirst(data.candidatures.filter((record) => !record.archived), 3),
    [data.candidatures],
  );
  const recentDocuments = useMemo(() => recentFirst([
    ...data.documents.workingCvs.map((document) => ({
      id: document.id,
      title: document.title,
      kind: "Working CV" as const,
      updatedAt: document.updatedAt,
    })),
    ...data.documents.letters.map((document) => ({
      id: document.id,
      title: document.title,
      kind: "Cover letter" as const,
      updatedAt: document.updatedAt,
    })),
  ], 3), [data.documents]);

  return (
    <section className="loaded-home" aria-label="Home">
      <header className="loaded-home-orientation">
        <img className="loaded-home-robot" src={logo} alt="AAAAT explorer robot holding a magnifying glass" />
        <div className="loaded-home-intro">
          <p className="console-section-code">AAAAT / LOCAL CONSOLE</p>
          <h1>Welcome back</h1>
          <p>Pick up recent local work or use the rail for another work area.</p>
        </div>
        <div className="loaded-home-workspace" aria-label="Active workspace">
          <span>WORKSPACE</span>
          <strong>{workspaceName}</strong>
          <small>{demoWorkspace ? "Demo workspace" : "Local workspace"}</small>
        </div>
      </header>

      {failed ? (
        <p className="loaded-home-load-note" role="status">
          Recent work could not be read. Your workspace is still available from the rail.
        </p>
      ) : null}

      <div className="loaded-home-work-grid">
        <section className="loaded-home-recent" aria-label="Recent applications">
          <div className="loaded-home-section-heading">
            <div>
              <p className="eyebrow">Applications</p>
              <h2>Recent applications</h2>
            </div>
          </div>
          {loading ? <p className="loaded-home-load-note">Reading recent local work…</p> : null}
          {!loading && recentApplications.length === 0 ? (
            <div className="loaded-home-empty">
              <p>No applications retained yet.</p>
              <button type="button" onClick={onOpenApplications}>Open Applications</button>
            </div>
          ) : null}
          <div className="loaded-home-recent-list">
            {recentApplications.map((record) => {
              const cues = candidatureRecognitionCues(record, data.fields, 2);
              const sourceExcerpt = cues.length === 0 ? retainedSourceExcerpt(record) : null;
              return (
                <button
                  key={record.id}
                  type="button"
                  className="loaded-home-recent-row"
                  onClick={() => onOpenApplication(record.id)}
                >
                  {cues.length > 0 ? cues.map((cue) => (
                    <span className="loaded-home-cue" key={cue.fieldId}>
                      <small>{cue.label}</small>
                      <strong>{cue.value}</strong>
                    </span>
                  )) : sourceExcerpt ? (
                    <span className="loaded-home-cue loaded-home-cue-wide">
                      <small>Retained source</small>
                      <strong>{sourceExcerpt}</strong>
                    </span>
                  ) : (
                    <span className="loaded-home-cue loaded-home-cue-wide">
                      <small>Saved application</small>
                      <strong>Add information when you need it.</strong>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="loaded-home-recent" aria-label="Recent document work">
          <div className="loaded-home-section-heading">
            <div>
              <p className="eyebrow">Documents</p>
              <h2>Recent editable work</h2>
            </div>
          </div>
          {loading ? <p className="loaded-home-load-note">Reading recent local work…</p> : null}
          {!loading && recentDocuments.length === 0 ? (
            <div className="loaded-home-empty">
              <p>No Working CVs or editable letters yet.</p>
              <button type="button" onClick={onOpenDocuments}>Open CVs</button>
            </div>
          ) : null}
          <div className="loaded-home-recent-list">
            {recentDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                className="loaded-home-recent-row loaded-home-document-row"
                onClick={() => onOpenDocument(document.id)}
              >
                <span className="loaded-home-cue loaded-home-cue-wide">
                  <small>{document.kind}</small>
                  <strong>{document.title}</strong>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
