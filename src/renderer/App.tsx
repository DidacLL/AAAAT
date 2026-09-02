import { useEffect, useState } from "react";

import logo from "./assets/aaaat-logo-light.png";

type WorkspacePhase = "idle" | "creating" | "ready" | "error";

export function App() {
  const [foundationReady, setFoundationReady] = useState(true);
  const [workspacePhase, setWorkspacePhase] =
    useState<WorkspacePhase>("idle");

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

    return () => {
      active = false;
    };
  }, []);

  const initializeWorkspace = async () => {
    setWorkspacePhase("creating");

    try {
      await window.aaaat.workspace.initialize();
      setWorkspacePhase("ready");
    } catch {
      setWorkspacePhase("error");
    }
  };

  const workspaceReady = workspacePhase === "ready";
  const creating = workspacePhase === "creating";

  return (
    <div className="app-shell">
      <header className="app-header">
        <img className="brand-mark" src={logo} alt="" />
        <span className="brand-name">AAAAT</span>
      </header>

      <main className="empty-state">
        <img
          className="hero-logo"
          src={logo}
          alt="AAAAT explorer robot holding a magnifying glass"
        />
        <p className="tagline">Your career workspace, on your computer.</p>
        <span className="accent-line" aria-hidden="true" />

        <h1>
          {workspaceReady
            ? "Local workspace ready."
            : "No workspace selected."}
        </h1>

        <button
          className="primary-action"
          type="button"
          disabled={creating || workspaceReady}
          onClick={() => void initializeWorkspace()}
        >
          {creating
            ? "Creating local workspace..."
            : workspaceReady
              ? "Workspace ready"
              : "Create local workspace"}
        </button>

        {workspacePhase === "error" ? (
          <p className="error-message" role="alert">
            The local workspace could not be created. Please try again.
          </p>
        ) : null}
      </main>

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
