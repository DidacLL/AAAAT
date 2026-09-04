import { useEffect, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import { AiDocumentsWorkspace } from "./AiDocumentsWorkspace";
import { AiSettingsWorkspace } from "./AiSettingsWorkspace";
import logo from "./assets/aaaat-logo-light.png";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { CareerContextPanel } from "./CareerContextPanel";
import { DocumentsWorkspace } from "./DocumentsWorkspace";
import { ProfileWorkspace } from "./ProfileWorkspace";

type WorkspacePhase = "loading" | "idle" | "choosing" | "ready";
type ProductView = "candidatures" | "profile" | "documents" | "ai-documents" | "settings";

export function App() {
  const [foundationReady, setFoundationReady] = useState(true);
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [productView, setProductView] = useState<ProductView>("candidatures");

  useEffect(() => {
    let active = true;
    void window.aaaat.system
      .info()
      .then(() => {
        if (active) setFoundationReady(true);
      })
      .catch(() => {
        if (active) setFoundationReady(false);
      });

    void window.aaaat.workspace
      .current()
      .then((currentWorkspace) => {
        if (!active) return;
        setWorkspace(currentWorkspace);
        setWorkspacePhase(currentWorkspace ? "ready" : "idle");
      })
      .catch(() => {
        if (active) {
          setWorkspacePhase("idle");
          setWorkspaceError(
            "The previous workspace is no longer available. Choose another workspace.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const chooseWorkspace = async (choice: WorkspaceChoice) => {
    setWorkspacePhase("choosing");
    setWorkspaceError(null);
    try {
      const selectedWorkspace = await window.aaaat.workspace.choose(choice);
      if (!selectedWorkspace) {
        setWorkspacePhase(workspace ? "ready" : "idle");
        return;
      }
      setWorkspace(selectedWorkspace);
      setWorkspacePhase("ready");
      setProductView("candidatures");
    } catch {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(
        choice === "create"
          ? "That folder cannot be used as an AAAAT workspace. Choose an empty folder or an existing AAAAT workspace."
          : "That folder is not a compatible AAAAT workspace. Choose another folder.",
      );
    }
  };

  const ready = workspacePhase === "ready" && workspace !== null;
  const choosing = workspacePhase === "choosing";
  const loading = workspacePhase === "loading";

  return (
    <div className="app-shell">
      <header className="app-header">
        <img className="brand-mark" src={logo} alt="" />
        <span className="brand-name">AAAAT</span>
      </header>

      {ready ? (
        <main className="workspace-screen">
          <section className="workspace-heading">
            <div>
              <p className="eyebrow">Local workspace</p>
              <h1>Workspace ready.</h1>
              <p className="workspace-path"><code>{workspace.rootPath}</code></p>
            </div>
            <button
              className="compact-secondary"
              type="button"
              disabled={choosing}
              onClick={() => void chooseWorkspace("create")}
            >
              {choosing ? "Choosing workspace..." : "Choose another workspace"}
            </button>
          </section>

          {workspaceError ? <p className="error-message" role="alert">{workspaceError}</p> : null}

          <nav className="product-tabs" aria-label="Workspace areas">
            <button
              type="button"
              className={productView === "candidatures" ? "active-product-tab" : ""}
              onClick={() => setProductView("candidatures")}
            >
              Candidatures
            </button>
            <button
              type="button"
              className={productView === "profile" ? "active-product-tab" : ""}
              onClick={() => setProductView("profile")}
            >
              Profile
            </button>
            <button
              type="button"
              className={productView === "documents" ? "active-product-tab" : ""}
              onClick={() => setProductView("documents")}
            >
              Documents
            </button>
            <button
              type="button"
              className={productView === "ai-documents" ? "active-product-tab" : ""}
              onClick={() => setProductView("ai-documents")}
            >
              AI assist
            </button>
            <button
              type="button"
              className={productView === "settings" ? "active-product-tab" : ""}
              onClick={() => setProductView("settings")}
            >
              Settings
            </button>
          </nav>

          {productView === "candidatures" ? (
            <CandidaturesWorkspace key={`candidatures-${workspace.rootPath}`} />
          ) : productView === "profile" ? (
            <div key={`profile-${workspace.rootPath}`}>
              <CareerContextPanel />
              <ProfileWorkspace />
            </div>
          ) : productView === "documents" ? (
            <DocumentsWorkspace key={`documents-${workspace.rootPath}`} />
          ) : productView === "ai-documents" ? (
            <AiDocumentsWorkspace key={`ai-documents-${workspace.rootPath}`} />
          ) : (
            <AiSettingsWorkspace key={`settings-${workspace.rootPath}`} />
          )}
        </main>
      ) : (
        <main className="empty-state">
          <img className="hero-logo" src={logo} alt="AAAAT explorer robot holding a magnifying glass" />
          <p className="tagline">Your career workspace, on your computer.</p>
          <span className="accent-line" aria-hidden="true" />
          <h1>
            {loading
              ? "Opening your workspace..."
              : "Choose where AAAAT should keep your career workspace."}
          </h1>
          {loading ? null : (
            <div className="workspace-actions">
              <button className="primary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("create")}>
                {choosing ? "Choosing workspace..." : "Create workspace"}
              </button>
              <button className="secondary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>
                Open existing workspace
              </button>
            </div>
          )}
          {workspaceError ? <p className="error-message" role="alert">{workspaceError}</p> : null}
        </main>
      )}

      <footer className="app-footer">
        <p>
          Local-first <span aria-hidden="true">{"\u00b7"}</span> Manual-capable{" "}
          <span aria-hidden="true">{"\u00b7"}</span> AI optional
        </p>
        <p>{foundationReady ? "Desktop foundation ready" : "Desktop foundation unavailable"}</p>
      </footer>
    </div>
  );
}
