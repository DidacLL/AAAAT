import { useEffect, useState } from "react";

import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";
import {
  buildSetupGuidance,
  type SetupGuidanceArtifact,
} from "./setup-guidance";

type SetupEnvironmentView = "all" | "rendering" | "guidance";

export function SetupEnvironmentPanel({ view = "all" }: { readonly view?: SetupEnvironmentView }) {
  const [snapshot, setSnapshot] = useState<SetupEnvironmentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    name: SetupGuidanceArtifact["name"];
    error: boolean;
    message: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await window.aaaat.setupEnvironment.current());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not inspect the current setup environment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyGuidance = async (artifact: SetupGuidanceArtifact) => {
    setCopyFeedback(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(artifact.text);
      setCopyFeedback({ name: artifact.name, error: false, message: `${artifact.name} copied.` });
    } catch {
      setCopyFeedback({
        name: artifact.name,
        error: true,
        message: "Clipboard copy failed. Select the guidance text and copy it manually.",
      });
    }
  };

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment
      .current()
      .then((current) => {
        if (active) setSnapshot(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not inspect the current setup environment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const guidance = snapshot ? buildSetupGuidance(snapshot) : null;
  const showStatus = view !== "guidance";
  const showGuidance = view !== "rendering";

  return (
    <>
      {showStatus ? (
        <section className="profile-workspace" aria-label="Setup environment">
          <div className="profile-column">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Document rendering</p>
                <h2>{snapshot?.tex.documentRenderingReady ? "Rendering available" : "Rendering status"}</h2>
              </div>
              <button
                type="button"
                className="compact-secondary"
                disabled={loading}
                onClick={() => void load()}
              >
                {loading ? "Checking…" : "Refresh status"}
              </button>
            </div>
            <p>
              {snapshot
                ? snapshot.tex.documentRenderingReady
                  ? "Local TeX rendering is available on this computer."
                  : "Document editing remains available, but local rendering needs compatible latexmk and pdflatex tools."
                : loading
                  ? "Checking local rendering capability…"
                  : "Rendering status is unavailable."}
            </p>
            {error ? <p className="error-message" role="alert">{error}</p> : null}
            {snapshot ? (
              <details>
                <summary>Technical details</summary>
                {snapshot.tex.commands.map((command) => (
                  <p key={command.command}>
                    <code>{command.command}</code>: {command.available ? "available" : "not found"}
                    {command.version ? ` · ${command.version}` : ""}
                  </p>
                ))}
              </details>
            ) : null}
          </div>

          {view === "all" ? (
            <div className="profile-column">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Capabilities</p>
                  <h2>Optional AI routes</h2>
                </div>
              </div>
              {snapshot ? (
                snapshot.ai.configurationReadable ? (
                  <>
                    <p>
                      {snapshot.ai.connectionCount} configured local AI connection{snapshot.ai.connectionCount === 1 ? "" : "s"}.
                      Operation availability reflects validated routing, not a model-quality score.
                    </p>
                    <div className="document-list">
                      {snapshot.ai.operations.map((status) => (
                        <article key={status.operation} className="document-card">
                          <div>
                            <h3>{aiOperationLabels[status.operation]}</h3>
                            <p>
                              {status.available && status.connectionName
                                ? `Available via ${status.connectionName}.`
                                : "No validated route is configured."}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="error-message">AAAAT could not read the optional AI connection configuration.</p>
                )
              ) : (
                <p>{loading ? "Checking configured capabilities…" : "Environment status is unavailable."}</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {showGuidance && guidance ? (
        <section className="profile-workspace" aria-label="Free-chat setup guidance">
          {guidance.map((artifact) => (
            <div className="profile-column" key={artifact.name}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">External tools</p>
                  <h2>{artifact.name}</h2>
                </div>
                <button
                  type="button"
                  className="compact-secondary"
                  onClick={() => void copyGuidance(artifact)}
                >
                  Copy {artifact.name}
                </button>
              </div>
              <p>
                Copy this setup-only prompt into a free chat assistant if useful. AAAAT does not send it automatically and does not control permissions granted to an external host or tool.
              </p>
              <details>
                <summary>Show guidance</summary>
                <label className="wide-field">
                  {artifact.name} guidance
                  <textarea
                    aria-label={`${artifact.name} guidance`}
                    rows={14}
                    readOnly
                    value={artifact.text}
                  />
                </label>
              </details>
              {copyFeedback?.name === artifact.name ? (
                <p
                  className={copyFeedback.error ? "error-message" : undefined}
                  role={copyFeedback.error ? "alert" : "status"}
                >
                  {copyFeedback.message}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
