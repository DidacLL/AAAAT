import { useEffect, useState } from "react";

import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";
import { buildSetupGuidance, type SetupHarnessView } from "./setup-guidance";

type SetupEnvironmentView = "all" | "rendering" | "guidance";

function HarnessCard({ harness }: { readonly harness: SetupHarnessView }) {
  return (
    <article className="setup-harness-card" aria-label={harness.name}>
      <p className="eyebrow">{harness.name}</p>
      <h3>{harness.title}</h3>
      <span className="setup-harness-status">{harness.state}</span>
      <p>{harness.summary}</p>
      <ul className="setup-harness-list">
        {harness.checks.map((check) => (
          <li key={check.label}>
            <strong>{check.label}:</strong> {check.detail}
          </li>
        ))}
      </ul>
      <details>
        <summary>External assistant access</summary>
        <p>{harness.externalCapability}</p>
      </details>
    </article>
  );
}

export function SetupEnvironmentPanel({ view = "all" }: { readonly view?: SetupEnvironmentView }) {
  const [snapshot, setSnapshot] = useState<SetupEnvironmentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await window.aaaat.setupEnvironment.current());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not inspect the current setup environment.");
    } finally {
      setLoading(false);
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
    return () => { active = false; };
  }, []);

  const harnesses = snapshot ? buildSetupGuidance(snapshot) : null;

  if (view === "all") {
    return (
      <>
        <section className="profile-workspace" aria-label="Setup environment">
          <div className="profile-column">
            <div className="section-heading">
              <div><p className="eyebrow">Environment</p><h2>Local setup status</h2></div>
              <button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>
                {loading ? "Checking…" : "Refresh environment"}
              </button>
            </div>
            <p>AAAAT reuses working software already available on this computer. Missing prerequisites are shown without giving any assistant generic machine authority.</p>
            {error ? <p className="error-message" role="alert">{error}</p> : null}
            {snapshot ? (
              <div className="document-list">
                <article className="document-card"><div><h3>Workspace</h3><p>{snapshot.workspaceReady ? "Configured workspace is available." : "Configured workspace is unavailable."}</p></div></article>
                <article className="document-card">
                  <div>
                    <h3>Document rendering</h3>
                    <p>{snapshot.tex.documentRenderingReady ? "Ready with the detected local TeX tools." : "Needs a compatible TeX installation providing latexmk and pdflatex."}</p>
                    <details>
                      <summary>Technical details</summary>
                      {snapshot.tex.commands.map((command) => (
                        <p key={command.command}><code>{command.command}</code>: {command.available ? "available" : "not found"}{command.version ? ` · ${command.version}` : ""}</p>
                      ))}
                    </details>
                  </div>
                </article>
              </div>
            ) : null}
          </div>
          <div className="profile-column">
            <div className="section-heading"><div><p className="eyebrow">Optional assistance</p><h2>AI coverage</h2></div></div>
            {snapshot ? (
              snapshot.ai.configurationReadable ? (
                <>
                  <p>{snapshot.ai.connectionCount} configured AI connection{snapshot.ai.connectionCount === 1 ? "" : "s"}. Availability reflects validated routing for each bounded operation.</p>
                  <div className="document-list">
                    {snapshot.ai.operations.map((status) => (
                      <article key={status.operation} className="document-card"><div><h3>{aiOperationLabels[status.operation]}</h3><p>{status.available && status.connectionName ? `Available via ${status.connectionName}.` : "No validated route is configured."}</p></div></article>
                    ))}
                  </div>
                </>
              ) : <p className="error-message">AAAAT could not read the optional AI connection configuration.</p>
            ) : <p>{loading ? "Checking configured capabilities…" : "Environment status is unavailable."}</p>}
          </div>
        </section>
        {harnesses ? (
          <section className="profile-workspace" aria-label="AAAAT setup harness">
            <div className="profile-column wide-profile-column">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Shared setup knowledge</p>
                  <h2>Installation &amp; configuration</h2>
                </div>
              </div>
              <p>
                <code>installer.ai</code> and <code>configurator.ai</code> are the same bounded setup model used by AAAAT itself. A compatible external assistant can inspect this status through AAAAT's bounded tool surface; copying a setup prompt is not required.
              </p>
              <div className="setup-harness-grid">
                {harnesses.map((harness) => <HarnessCard key={harness.name} harness={harness} />)}
              </div>
            </div>
          </section>
        ) : null}
      </>
    );
  }

  if (view === "rendering") {
    return (
      <section className="profile-workspace" aria-label="Setup environment">
        <div className="profile-column">
          <div className="section-heading">
            <div><p className="eyebrow">Document rendering</p><h2>{snapshot?.tex.documentRenderingReady ? "Rendering available" : "Rendering status"}</h2></div>
            <button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Refresh status"}</button>
          </div>
          <p>{snapshot ? snapshot.tex.documentRenderingReady ? "Local TeX rendering is available on this computer." : "Document editing remains available, but local rendering needs compatible latexmk and pdflatex tools." : loading ? "Checking local rendering capability…" : "Rendering status is unavailable."}</p>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {snapshot ? (
            <details><summary>Technical details</summary>{snapshot.tex.commands.map((command) => <p key={command.command}><code>{command.command}</code>: {command.available ? "available" : "not found"}{command.version ? ` · ${command.version}` : ""}</p>)}</details>
          ) : null}
        </div>
      </section>
    );
  }

  return harnesses ? (
    <section className="profile-workspace" aria-label="AAAAT setup harness">
      <div className="profile-column wide-profile-column">
        <div className="section-heading">
          <div><p className="eyebrow">Installation &amp; configuration</p><h2>AAAAT setup harness</h2></div>
          <button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Refresh status"}</button>
        </div>
        <p>
          This is live AAAAT setup state, not a prompt template. The same privacy-minimal status can be read by a compatible external assistant through AAAAT's bounded tools.
        </p>
        <div className="setup-harness-grid">
          {harnesses.map((harness) => <HarnessCard key={harness.name} harness={harness} />)}
        </div>
      </div>
    </section>
  ) : (
    <section className="profile-workspace" aria-label="AAAAT setup harness"><div className="profile-column">{error ? <p className="error-message" role="alert">{error}</p> : <p>{loading ? "Loading setup status…" : "Setup status is unavailable."}</p>}</div></section>
  );
}
