import { useEffect, useRef, useState } from "react";

import type { OptionalToolsChoice, OptionalToolsStatus } from "../shared/optional-tools-contracts";

export function OptionalToolsDialog({ initialChoice, onClose, onChanged }: {
  readonly initialChoice: OptionalToolsChoice;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(initialChoice);
  const [status, setStatus] = useState<OptionalToolsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    const refresh = () => void window.aaaat.optionalTools.current()
      .then(next => { if (active) setStatus(next); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not read tool setup."); });
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const close = async () => {
    try { await window.aaaat.optionalTools.dismiss(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not finish setup."); }
  };
  const install = async () => {
    setError(null);
    setStatus(current => current ? { ...current, busy: true, error: null } : current);
    try {
      const next = await window.aaaat.optionalTools.install({
        localAi: choice.localAi && !status?.localAiReady,
        pdf: choice.pdf && !status?.pdfReady,
      });
      setStatus(next);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tool setup could not finish.");
      setStatus(current => current ? { ...current, busy: false } : current);
    }
  };
  const selectable = (choice.localAi && !status?.localAiReady && status?.localAiSupported) || (choice.pdf && !status?.pdfReady);

  return <dialog ref={dialog} className="optional-tools-dialog" aria-labelledby="optional-tools-title" onCancel={event => { event.preventDefault(); void close(); }}>
    <h2 id="optional-tools-title">Make AAAAT ready for you</h2>
    <div className="optional-tools-choices">
      <label>
        <input type="checkbox" checked={status?.localAiReady || choice.localAi} disabled={!status || status.busy || status.localAiReady || !status.localAiSupported} onChange={event => setChoice(current => ({ ...current, localAi: event.target.checked }))} />
        <span><strong>Local AI</strong><small>{status?.localAiReady ? "Installed" : status && !status.localAiSupported ? "Not available for this device" : "Granite 4.1 3B with llama.cpp · about 2 GB"}</small></span>
      </label>
      <label>
        <input type="checkbox" checked={status?.pdfReady || choice.pdf} disabled={!status || status.busy || status.pdfReady} onChange={event => setChoice(current => ({ ...current, pdf: event.target.checked }))} />
        <span><strong>PDF generation</strong><small>{status?.pdfReady ? "Already available" : `Install ${status?.pdfLabel ?? "PDF tools"}`}</small></span>
      </label>
    </div>
    {status?.message ? <p role="status">{status.message}</p> : null}
    {status?.busy && status.totalBytes > 0 ? <progress value={status.downloadedBytes} max={status.totalBytes} aria-label="Download progress" /> : null}
    {status?.busy && status.downloadedBytes > 0 ? <small>{(status.downloadedBytes / 1024 / 1024).toFixed(0)} MB downloaded</small> : null}
    {error || status?.error ? <p className="error-message" role="alert">{error ?? status?.error}</p> : null}
    <details><summary>Downloads and licenses</summary><p>Only selected tools are downloaded. PDF setup may also download fonts and language packages. Existing tools and your workspaces are kept.</p><p>Sources: IBM Granite (Apache 2.0), llama.cpp (MIT), MiKTeX and TeX Live/BasicTeX under their published distribution licenses. Windows may also need the Microsoft Visual C++ runtime; its own setup shows the license and permission choices.</p></details>
    <div className="optional-tools-actions">
      <button className="secondary-action" type="button" onClick={() => void close()}>{status?.busy ? "Continue in background" : status?.message ? "Done" : "Not now"}</button>
      {status?.busy ? status.canCancel ? <button className="secondary-action" type="button" onClick={() => void window.aaaat.optionalTools.cancel()}>Cancel download</button> : null : <button className="primary-action" type="button" disabled={!status || !selectable} onClick={() => void install()}>Install selected</button>}
    </div>
  </dialog>;
}
