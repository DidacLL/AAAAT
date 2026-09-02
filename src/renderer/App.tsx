import { useEffect, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import logo from "./assets/aaaat-logo-light.png";
import { ProfileWorkspace } from "./ProfileWorkspace";

type WorkspacePhase = "loading" | "idle" | "choosing" | "ready";

export function App() {
  const [foundationReady, setFoundationReady] = useState(true);
  const [workspacePhase, setWorkspacePhase] =
    useState<WorkspacePhase>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void window.aaaat.system
      .info()
      .then(() => {
        if (active) {
          setFoundationReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setFoundationReady(false);
        }
      });

    void window.aaaat.workspace
      .current()
      .then((currentWorkspace) => {
        if (!active) {
          return;
        }

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
              <p className="workspace-path">
                <code>{workspace.rootPath}</code>
              </p>
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

          {workspaceError ? (
            <p className="error-message" role="alert">
              {workspaceError}
            </p>
          ) : null}

          <ProfileWorkspace key={workspace.rootPath} />
        </main>
      ) : (
        <main className="empty-state">
          <img
            className="hero-logo"
            src={logo}
            alt="AAAAT explorer robot holding a magnifying glass"
          />
          <p className="tagline">Your career workspace, on your computer.</p>
          <span className="accent-line" aria-hidden="true" />

          <h1>
            {loading
              ? "Opening your workspace..."
              : "Choose where AAAAT should keep your career workspace."}
          </h1>

          {loading ? null : (
            <div className="workspace-actions">
              <button
                className="primary-action"
                type="button"
                disabled={choosing}
                onClick={() => void chooseWorkspace("create")}
              >
                {choosing ? "Choosing workspace..." : "Create workspace"}
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={choosing}
                onClick={() => void chooseWorkspace("open")}
              >
                Open existing workspace
              </button>
            </div>
          )}

          {workspaceError ? (
            <p className="error-message" role="alert">
              {workspaceError}
            </p>
          ) : null}
        </main>
      )}

      <footer className="app-footer">
        <p>
          Local-first <span aria-hidden="true">{"\u00b7"}</span> Manual-first{" "}
          <span aria-hidden="true">{"\u00b7"}</span> AI optional
        </p>
        <p>
          {foundationReady
            ? "Desktop foundation ready"
            : "Desktop foundation unavailable"}
        </p>
      </footer>
    </div>
  );
}
