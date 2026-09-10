import { useState } from "react";

import type { VscodeConnectionResult } from "../shared/setup-environment-contracts";

export function VscodeExternalToolSetup() {
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<VscodeConnectionResult | null>(null);

  const connect = async () => {
    setConnecting(true);
    setResult(null);
    try {
      setResult(await window.aaaat.setupEnvironment.connectVscode());
    } catch {
      setResult({
        status: "failed",
        message: "AAAAT could not start VS Code project setup. Try again from the packaged desktop app.",
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="profile-workspace" aria-label="VS Code external tool setup">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">External AI host</p>
            <h3>VS Code</h3>
          </div>
          <button type="button" className="compact-secondary" disabled={connecting} onClick={() => void connect()}>
            {connecting ? "Connecting…" : "Connect VS Code project"}
          </button>
        </div>
        <p>
          Choose a VS Code project to make this AAAAT workspace available there as a bounded external tool. AAAAT validates the current connection before changing the project; VS Code still decides whether to trust and enable it.
        </p>
        <p>
          The external tool can create a candidature from supplied source material, work only with the one candidature you locally select for opportunity research, retain one returned Source, read the bounded Career/CV context you explicitly allow, and request an authorized local CV render. It cannot browse your local corpus or receive arbitrary filesystem, shell, process, database, or identifier-based mutation authority.
        </p>
        {result ? (
          <p className={result.status === "failed" ? "error-message" : undefined} role={result.status === "failed" ? "alert" : "status"}>
            {result.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
