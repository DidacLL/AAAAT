import { useContext, useEffect, useState } from "react";
import { PageToolbar } from "./PageToolbar";
import { ToolbarVisible } from "./toolbar-context";
import { NewApplicationPanel } from "./NewApplicationPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import type { ApplicationTagContext } from "./TagVisor";
import "./candidature-capture.css";

export function CandidaturesAiWorkspace({ initialCandidatureId, onInitialCandidatureCleared, onDirtyChange, onTagGlossaryChange, onTagContextChange }: {
  readonly initialCandidatureId?: string;
  readonly onInitialCandidatureCleared?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onTagGlossaryChange?: () => void;
  readonly onTagContextChange?: (context: ApplicationTagContext | null) => void;
}) {
  const toolbarVisible = useContext(ToolbarVisible);
  const [view, setView] = useState<"applications" | "new">("applications");
  const [newStarted, setNewStarted] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<string | null>(initialCandidatureId ?? null);
  const [newDirty, setNewDirty] = useState(false);
  const [applicationDirty, setApplicationDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(newDirty || applicationDirty); }, [newDirty, applicationDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const finishDraft = () => { setNewStarted(false); setNewDirty(false); setDraftRevision(current => current + 1); setView("applications"); };
  const created = (id: string) => {
    finishDraft(); setSelection(id); setRevision(current => current + 1); onTagGlossaryChange?.();
  };
  return <div className="candidature-capture-owner">
    <PageToolbar><nav className="application-view-switcher" aria-label="Application view"><div>
      <button type="button" className={view === "applications" ? "active" : ""} aria-pressed={view === "applications"} onClick={() => setView("applications")}>Applications</button>
      <button type="button" aria-label={newStarted ? "Resume new application" : "New application"} className={view === "new" ? "active" : ""} aria-pressed={view === "new"} onClick={() => { setNewStarted(true); setView("new"); }}>{newStarted && view !== "new" ? "Draft" : "＋ New"}</button>
    </div></nav></PageToolbar>
    {newStarted ? <ToolbarVisible.Provider value={toolbarVisible && view === "new"}><div hidden={view !== "new"}>
      <NewApplicationPanel key={draftRevision} onCreated={created} onCancel={finishDraft} onDirtyChange={setNewDirty} />
    </div></ToolbarVisible.Provider> : null}
    <ToolbarVisible.Provider value={toolbarVisible && view === "applications"}><div hidden={view !== "applications"}>
      <CandidaturesWorkspace key={revision} initialSelection={selection ? { candidatureId: selection } : undefined} onInitialSelectionCleared={() => { setSelection(null); onInitialCandidatureCleared?.(); }} onDirtyChange={setApplicationDirty} onTagGlossaryChange={onTagGlossaryChange} onTagContextChange={onTagContextChange} />
    </div></ToolbarVisible.Provider>
  </div>;
}
