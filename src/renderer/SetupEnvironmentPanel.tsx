import { useEffect, useState } from "react";

import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { SetupAssistantAccess } from "../shared/setup-assistant-contracts";
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
          <li key={check.label}><strong>{check.label}:</strong> {check.detail}</li>
        ))}
      </ul>
      <details>
        <summary>External assistant boundary</summary>
        <p>{harness.externalCapability}</p>
      </details>
    </article>
  );
}

function SetupActionAuthority({
  access,
  saving,
  onChange,
}: {
  readonly access: SetupAssistantAccess;
  readonly saving: boolean;
  readonly onChange: (next: SetupAssistantAccess) => void;
}) {
  return (
    <section className="setup-action-authority" aria-label="External setup action authority">
      <div>
        <p className="eyebrow">Explicit local control</p>
        <h3>Allow bounded setup actions</h3>
        <p>
          Status can always be inspected. Mutating setup actions stay denied until you enable them here,
          and these switches grant only the typed AAAAT actions described below.
        </p>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={access.installerActionsAllowed}
          disabled={saving}
          onChange={(event) => onChange({ ...access, installerActionsAllowed: event.target.checked })}
        />
        <span>
          <strong>installer.ai actions</strong><br />
          Allow AAAAT's fixed rendering self-test. No command, path, filesystem or package-manager input is exposed.
        </span>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={access.configuratorActionsAllowed}
          disabled={saving}
          onChange={(event) => onChange({ ...access, configuratorActionsAllowed: event.target.checked })}
        />
        <span>
          <strong>configurator.ai actions</strong><br />
          Allow save, capability validation and per-operation default selection for typed AAAAT AI connections only.
        </span>
      </label>
    </section>
  );
}

export function SetupEnvironmentPanel({ view = "all" }: { readonly view?: SetupEnvironmentView }) {
  const [snapshot, setSnapshot] = useState<SetupEnvironmentSnapshot | null>(null);
  const [access, setAccess] = useState<SetupAssistantAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccess, setSavingAccess] = useState(false);
  const [selfTesting, setSelfTesting] = useState(false);
  const [selfTestResult, setSelfTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSnapshot, nextAccess] = await Promise.all([
        window.aaaat.setupEnvironment.current(),
        window.aaaat.setupAssistant.access(),
      ]);
      setSnapshot(nextSnapshot);
      setAccess(nextAccess);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not inspect the current setup environment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.setupEnvironment.current(),
      window.aaaat.setupAssistant.access(),
    ])
      .then(([nextSnapshot, nextAccess]) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setAccess(nextAccess);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "AAAAT could not inspect the current setup environment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateAccess = async (next: SetupAssistantAccess) => {
    setSavingAccess(true);
    setError(null);
    try {
      setAccess(await window.aaaat.setupAssistant.updateAccess(next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change external setup authority.");
    } finally {
      setSavingAccess(false);
    }
  };

  const runSelfTest = async () => {
    setSelfTesting(true);
    setSelfTestResult(null);
    setError(null);
    try {
      await window.aaaat.setupAssistant.runRenderingSelfTest();
      setSelfTestResult("Rendering self-test passed. AAAAT created, rendered and removed its temporary test document.");
      setSnapshot(await window.aaaat.setupEnvironment.current());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT's rendering self-test failed.");
    } finally {
      setSelfTesting(false);
    }
  };


  const harnesses = snapshot ? buildSetupGuidance(snapshot) : null;
  const authority = access ? (
    <SetupActionAuthority access={access} saving={savingAccess} onChange={(next) => void updateAccess(next)} />
  ) : null;

  if (view === "all") {
    return (
      <>
        <section className="profile-workspace" aria-label="Setup environment">
          <div className="profile-column">
            <div className="section-heading">
              <div><p className="eyebrow">Environment</p><h2>Local setup status</h2></div>
              <button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Refresh environment"}</button>
            </div>
            <p>AAAAT reuses working software already available on this computer. Missing prerequisites are shown without giving any assistant generic machine authority.</p>
            {error ? <p className="error-message" role="alert">{error}</p> : null}
            {snapshot ? (
              <div className="document-list">
                <article className="document-card"><div><h3>Workspace</h3><p>{snapshot.workspaceReady ? "Configured workspace is available." : "Configured workspace is unavailable."}</p></div></article>
                <article className="document-card"><div><h3>Document rendering</h3><p>{snapshot.tex.documentRenderingReady ? "Ready with the detected local TeX tools." : "Needs a compatible TeX installation providing latexmk and pdflatex."}</p><details><summary>Technical details</summary>{snapshot.tex.commands.map((command) => <p key={command.command}><code>{command.command}</code>: {command.available ? "available" : "not found"}{command.version ? ` · ${command.version}` : ""}</p>)}</details></div></article>
              </div>
            ) : null}
          </div>
          <div className="profile-column">
            <div className="section-heading"><div><p className="eyebrow">Optional assistance</p><h2>AI coverage</h2></div></div>
            {snapshot ? snapshot.ai.configurationReadable ? (
              <><p>{snapshot.ai.connectionCount} configured AI connection{snapshot.ai.connectionCount === 1 ? "" : "s"}. Availability reflects validated routing for each bounded operation.</p><div className="document-list">{snapshot.ai.operations.map((status) => <article key={status.operation} className="document-card"><div><h3>{aiOperationLabels[status.operation]}</h3><p>{status.available && status.connectionName ? `Available via ${status.connectionName}.` : "No validated route is configured."}</p></div></article>)}</div></>
            ) : <p className="error-message">AAAAT could not read the optional AI connection configuration.</p> : <p>{loading ? "Checking configured capabilities…" : "Environment status is unavailable."}</p>}
          </div>
        </section>
        {harnesses ? <section className="profile-workspace" aria-label="AAAAT setup harness"><div className="profile-column wide-profile-column"><div className="section-heading"><div><p className="eyebrow">Shared setup knowledge</p><h2>Installation &amp; configuration</h2></div></div><p><code>installer.ai</code> and <code>configurator.ai</code> expose live AAAAT setup state and narrowly scoped actions. They are not clipboard prompts and do not receive generic machine authority.</p><div className="setup-harness-grid">{harnesses.map((harness) => <HarnessCard key={harness.name} harness={harness} />)}</div>{authority}</div></section> : null}
      </>
    );
  }

  if (view === "rendering") {
    return (
      <section className="profile-workspace" aria-label="Setup environment">
        <div className="profile-column">
          <div className="section-heading"><div><p className="eyebrow">Document rendering</p><h2>{snapshot?.tex.documentRenderingReady ? "Rendering available" : "Rendering status"}</h2></div><button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Refresh status"}</button></div>
          <p>{snapshot ? snapshot.tex.documentRenderingReady ? "Local TeX rendering is available on this computer." : "Document editing remains available, but local rendering needs compatible latexmk and pdflatex tools." : loading ? "Checking local rendering capability…" : "Rendering status is unavailable."}</p>
          <div className="button-row"><button type="button" disabled={selfTesting} onClick={() => void runSelfTest()}>{selfTesting ? "Running self-test…" : "Run rendering self-test"}</button></div>
          {selfTestResult ? <p className="document-notice" role="status">{selfTestResult}</p> : null}
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {snapshot ? <details><summary>Technical details</summary>{snapshot.tex.commands.map((command) => <p key={command.command}><code>{command.command}</code>: {command.available ? "available" : "not found"}{command.version ? ` · ${command.version}` : ""}</p>)}</details> : null}
        </div>
      </section>
    );
  }

  return harnesses ? (
    <section className="profile-workspace" aria-label="AAAAT setup harness">
      <div className="profile-column wide-profile-column">
        <div className="section-heading"><div><p className="eyebrow">Installation &amp; configuration</p><h2>AAAAT setup capabilities</h2></div><button type="button" className="compact-secondary" disabled={loading} onClick={() => void load()}>{loading ? "Checking…" : "Refresh status"}</button></div>
        <p>This is live AAAAT setup state plus explicit product-specific authority. Compatible external assistants can inspect status and, only when locally enabled below, invoke the same bounded setup intentions.</p>
        <div className="setup-harness-grid">{harnesses.map((harness) => <HarnessCard key={harness.name} harness={harness} />)}</div>
        {authority}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </section>
  ) : (
    <section className="profile-workspace" aria-label="AAAAT setup harness"><div className="profile-column">{error ? <p className="error-message" role="alert">{error}</p> : <p>{loading ? "Loading setup status…" : "Setup status is unavailable."}</p>}</div></section>
  );
}
