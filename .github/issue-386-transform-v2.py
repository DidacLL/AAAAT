from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one replacement for {old[:60]!r}, found {count}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex replacement for {pattern[:60]!r}, found {count}")
    write(path, next_text)


# Projection: favourite information remains primary; Source is a separate, bounded fallback.
replace_once(
    "src/renderer/candidature-projections.ts",
    '''export interface CandidatureRecognitionCue {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly presentationSize: CandidaturePresentationSize;
  readonly favourite: boolean;
}
''',
    '''export interface CandidatureRecognitionCue {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly presentationSize: CandidaturePresentationSize;
  readonly favourite: boolean;
}

export interface CandidatureRecognitionProjection {
  readonly primaryCues: readonly CandidatureRecognitionCue[];
  readonly retainedSourceCue: CandidatureRecognitionCue | null;
}
''',
)
replace_once(
    "src/renderer/candidature-projections.ts",
    '''export function filterCandidatures(
''',
    '''export function candidatureRetainedSourceCue(
  record: CandidatureRecord,
  limit = 120,
): CandidatureRecognitionCue | null {
  const normalized = record.sourceSearchText.replace(/\\s+/g, " ").trim();
  if (!normalized) return null;
  const boundedLimit = Math.max(2, limit);
  const value = normalized.length > boundedLimit
    ? `${normalized.slice(0, boundedLimit - 1).trimEnd()}…`
    : normalized;
  return {
    fieldId: "retained-source",
    label: "Retained source",
    value,
    presentationSize: "wide",
    favourite: false,
  };
}

export function candidatureRecognitionProjection(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  limit = 4,
): CandidatureRecognitionProjection {
  const primaryCues = candidatureRecognitionCues(record, fields, limit);
  return {
    primaryCues,
    retainedSourceCue:
      primaryCues.length === 0 ? candidatureRetainedSourceCue(record) : null,
  };
}

export function filterCandidatures(
''',
)

# Loaded Home keeps the accepted #383 fallback, now via the shared projection.
replace_once(
    "src/renderer/LoadedHome.tsx",
    'import { candidatureRecognitionCues } from "./candidature-projections";',
    'import { candidatureRecognitionProjection } from "./candidature-projections";',
)
regex_once(
    "src/renderer/LoadedHome.tsx",
    r'function retainedSourceExcerpt\(record: CandidatureRecord\): string \| null \{.*?\n\}\n\n',
    '',
)
replace_once(
    "src/renderer/LoadedHome.tsx",
    '''              const cues = candidatureRecognitionCues(record, data.fields, 2);
              const sourceExcerpt = cues.length === 0 ? retainedSourceExcerpt(record) : null;
''',
    '''              const recognition = candidatureRecognitionProjection(record, data.fields, 2);
              const cues = recognition.primaryCues;
              const sourceCue = recognition.retainedSourceCue;
''',
)
replace_once(
    "src/renderer/LoadedHome.tsx",
    '''                  )) : sourceExcerpt ? (
                    <span className="loaded-home-cue loaded-home-cue-wide">
                      <small>Retained source</small>
                      <strong>{sourceExcerpt}</strong>
                    </span>
''',
    '''                  )) : sourceCue ? (
                    <span className="loaded-home-cue loaded-home-cue-wide">
                      <small>{sourceCue.label}</small>
                      <strong>{sourceCue.value}</strong>
                    </span>
''',
)

# Retained Send-to-my-AI access stays discoverable but no longer expands itself.
regex_once(
    "src/renderer/CandidatureOpportunityResearchAccessPanel.tsx",
    r'''void Promise\.all\(\[api\.current\(candidatureId\), api\.taskTemplates\(\)\]\)\n\s*\.then\(async \(\[current, templates\]\) => \{.*?setEditorOpen\(true\);\n\s*\}\)''',
    '''void Promise.all([api.current(candidatureId), api.taskTemplates()])
      .then(([current, templates]) => {
        if (!active) return;
        setAccess(current);
        setUserTemplates(templates);
        setTaskContext(null);
        setEditorOpen(false);
      })''',
)
replace_once(
    "src/renderer/CandidatureOpportunityResearchAccessPanel.tsx",
    '''          <p>Choose or write a task for this application and use it with your preferred AI.</p>
''',
    '''          <p>
            {access?.allowed
              ? "Task access is ready. Open it when you want to review or send it."
              : "Choose or write a task for this application and use it with your preferred AI."}
          </p>
''',
)

# Corpus recognition and selected-view hierarchy.
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''  candidatureRecognitionCues,
''',
    '''  candidatureRecognitionProjection,
''',
)
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''              const primaryCues = candidatureRecognitionCues(record, fields, 4);
''',
    '''              const recognition = candidatureRecognitionProjection(record, fields, 4);
              const primaryCues = recognition.primaryCues;
''',
)
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''                    ) : (
                      <span className="candidature-neutral-reference">No displayable information yet</span>
                    )}
''',
    '''                    ) : recognition.retainedSourceCue ? (
                      <span className="candidature-recognition-cues">
                        <span
                          className="candidature-recognition-cue candidature-cue-size-wide candidature-retained-source-cue"
                        >
                          <span className="candidature-cue-label">
                            {recognition.retainedSourceCue.label}
                          </span>
                          <span className="candidature-cue-value">
                            {recognition.retainedSourceCue.value}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="candidature-neutral-reference">Saved application</span>
                    )}
''',
)
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''    : applicationLetters[0]?.id ?? "";

  const createPacket = async () => {
''',
    '''    : applicationLetters[0]?.id ?? "";
  const selectedRecognition = candidatureRecognitionProjection(selected, fields, 1);
  const sourceOwnsInitialContext =
    initialTask !== undefined || selectedRecognition.retainedSourceCue !== null;

  const createPacket = async () => {
''',
)
regex_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    r'''\{initialTask \? \(\n\s*<CandidatureSourcesPanel.*?\n\s*\) : \(\n\s*<CandidatureOpportunityResearchAccessPanel.*?\n\s*\)\}\n\n\s*<section\n\s*className="section-surface candidature-primary-information"''',
    '''{sourceOwnsInitialContext ? (
        <CandidatureSourcesPanel
          candidatureId={selected.id}
          onSourcesChanged={() => void handleSourcesChanged()}
          onDirtyChange={setSourceDirty}
        />
      ) : null}

      <section
        className="section-surface candidature-primary-information"''',
)
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''      </section>

      <section className="section-surface candidature-tags-direct" aria-label="Tags">
''',
    '''      </section>

      {initialTask ? null : (
        <CandidatureOpportunityResearchAccessPanel
          key={`external-research-${selected.id}`}
          candidatureId={selected.id}
          contextDirty={taskContextDirty}
        />
      )}

      <section className="section-surface candidature-tags-direct" aria-label="Tags">
''',
)
replace_once(
    "src/renderer/CandidaturesWorkspace.tsx",
    '''          {initialTask ? null : (
            <CandidatureSourcesPanel
''',
    '''          {sourceOwnsInitialContext ? null : (
            <CandidatureSourcesPanel
''',
)

replace_once(
    "src/renderer/candidature-recovery.css",
    '''.candidature-search-match {
  display: grid;
''',
    '''.candidature-retained-source-cue .candidature-cue-label {
  display: block;
  margin-bottom: 0.16rem;
  color: var(--muted-ink);
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.candidature-search-match {
  display: grid;
''',
)

# Projection acceptance: primary precedence, no non-favourite promotion, bounded Source fallback.
replace_once(
    "test/candidature-projections.test.ts",
    '''  candidatureRecognitionCues,
''',
    '''  candidatureRecognitionCues,
  candidatureRecognitionProjection,
  candidatureRetainedSourceCue,
''',
)
replace_once(
    "test/candidature-projections.test.ts",
    '''    expect(candidatureRecognitionCues(candidate, [locationField, roleField], 3)).toEqual([
      expect.objectContaining({
        fieldId: roleField.definition.id,
        label: "Role",
        value: "Pilot",
        presentationSize: "normal",
        favourite: true,
      }),
    ]);
''',
    '''    expect(candidatureRecognitionCues(candidate, [locationField, roleField], 3)).toEqual([
      expect.objectContaining({
        fieldId: roleField.definition.id,
        label: "Role",
        value: "Pilot",
        presentationSize: "normal",
        favourite: true,
      }),
    ]);
    expect(candidatureRecognitionProjection(candidate, [locationField, roleField], 3).retainedSourceCue)
      .toBeNull();
''',
)
regex_once(
    "test/candidature-projections.test.ts",
    r'''  it\("does not silently promote retained values when the user has no favourite fields".*?\n  \}\);\n\n  it\("does not use raw Source as an automatic ordinary corpus cue".*?\n  \}\);''',
    '''  it("does not promote non-favourite values ahead of retained Source fallback", () => {
    const candidateId = "00000000-0000-4000-8000-000000000419";
    const candidate = {
      ...record(candidateId),
      sourceSearchText: "Recruiter note for a retained opportunity.",
      values: [{
        candidatureId: candidateId,
        fieldId: locationField.definition.id,
        value: "Madrid",
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      }],
    };

    expect(candidatureRecognitionCues(candidate, [locationField], 3)).toEqual([]);
    expect(candidatureRecognitionProjection(candidate, [locationField], 3)).toMatchObject({
      primaryCues: [],
      retainedSourceCue: {
        label: "Retained source",
        value: "Recruiter note for a retained opportunity.",
        favourite: false,
      },
    });
  });

  it("normalizes and bounds retained Source as an explicit recognition fallback", () => {
    const sourceOnly = {
      ...record("00000000-0000-4000-8000-000000000413"),
      sourceSearchText: `  Nimbus Labs   is hiring a platform engineer in Barcelona.\\n${"Long detail ".repeat(20)}`,
    };

    expect(candidatureRecognitionCues(sourceOnly, [])).toEqual([]);
    const cue = candidatureRetainedSourceCue(sourceOnly, 80);
    expect(cue).toMatchObject({
      fieldId: "retained-source",
      label: "Retained source",
      presentationSize: "wide",
      favourite: false,
    });
    expect(cue?.value).toMatch(/^Nimbus Labs is hiring/);
    expect(cue?.value).not.toMatch(/\\s{2,}/);
    expect(cue?.value.length).toBeLessThanOrEqual(80);
    expect(cue?.value.endsWith("…")).toBe(true);
  });

  it("keeps a neutral projection only when neither primary information nor Source is useful", () => {
    expect(candidatureRecognitionProjection(record("00000000-0000-4000-8000-000000000423"), []))
      .toEqual({ primaryCues: [], retainedSourceCue: null });
  });''',
)

# Selected hierarchy + deliberate AI expansion while preserving the existing detailed tests.
replace_once(
    "test/CandidatureOpportunityResearchAccessWorkspace.test.tsx",
    '''describe("selected candidature Send to my AI", () => {
''',
    '''describe("selected candidature Send to my AI", () => {
  it("keeps retained task access collapsed behind application content until deliberately opened", async () => {
    prepareAccessApi();
    current.mockResolvedValue({ candidatureId, allowed: true });
    const user = userEvent.setup();
    const open = await openSelectedCandidature(user);

    await waitFor(() => expect(current).toHaveBeenCalledWith(candidatureId));
    const selected = screen.getByRole("region", { name: "Application information" });
    const primary = screen.getByRole("region", { name: "Starred application information" });
    const externalAi = screen.getByRole("region", { name: "Send to my AI" });
    expect(selected).toContainElement(primary);
    expect(selected).toContainElement(externalAi);
    expect(primary.compareDocumentPosition(externalAi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primary).toHaveTextContent("Platform Engineer");
    expect(screen.queryByLabelText("Task instructions")).not.toBeInTheDocument();
    expect(taskContext).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();

    await user.click(open);
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(taskContext).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Task instructions")).toBeVisible();
    expect(screen.getByRole("region", { name: "Context sent with task" })).toHaveTextContent("Platform Engineer");
  });

''',
)

# Raw-only save -> corpus recognition -> normal reopen with Source and manual editing.
replace_once(
    "test/NewApplicationRecovery.test.tsx",
    '''  it("keeps the retained Source and manual continuation available when the AI continuation fails", async () => {
''',
    '''  it("recognizes a saved raw-only application from retained Source and reopens it with Source immediately reachable", async () => {
    installApi();
    const user = userEvent.setup();
    const raw = "  Aster Aviation seeks a captain.\\nKeep this exact text.  ";
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: /Retain raw material/ }));
    await user.type(screen.getByLabelText("Application raw material"), raw);
    await user.click(screen.getByRole("button", { name: "Retain raw material" }));

    await screen.findByRole("region", { name: "Raw material continuation" });
    await user.click(screen.getByRole("button", { name: "← Applications" }));
    const corpus = screen.getByLabelText("Application corpus");
    const entry = within(corpus).getByRole("button", { name: "Open saved application" });
    expect(within(entry).getByText("Retained source")).toBeVisible();
    expect(entry).toHaveTextContent("Aster Aviation seeks a captain. Keep this exact text.");

    await user.click(entry);
    expect(await screen.findByRole("region", { name: "Sources" })).toBeVisible();
    const role = screen.getByRole("article", { name: "Role information" });
    expect(within(role).getByRole("button", { name: "Edit Role" })).toBeVisible();
  });

  it("keeps the retained Source and manual continuation available when the AI continuation fails", async () => {
''',
)

# Tags and Documents remain reachable in the selected-information experience.
replace_once(
    "test/CandidatureFieldCohesion.test.tsx",
    '''    await user.click(screen.getByText("More"));
    const more = screen.getByRole("region", { name: "More application information" });
''',
    '''    expect(screen.getByRole("region", { name: "Tags" })).toBeVisible();
    await user.click(screen.getByText("More"));
    const more = screen.getByRole("region", { name: "More application information" });
    expect(screen.getByRole("region", { name: "Application documents" })).toBeVisible();
''',
)

# Supported Windows package journey covers raw-only corpus/reopen and ordinary selected hierarchy.
regex_once(
    "test/desktop/packaged-manual-candidature.spec.ts",
    r'''    await continuation\.getByRole\("button", \{ name: "Fill information manually" \}\)\.click\(\);.*?    await expect\(reopenedSources\.getByRole\("article", \{ name: "Source content" \}\)\)\.toContainText\(rawMaterial\);''',
    '''    const retainedSelection = running.page.getByRole("region", { name: "Application information" });
    await retainedSelection.getByRole("button", { name: "← Applications" }).click();
    const corpus = running.page.getByLabel("Application corpus");
    const candidatureEntries = corpus.getByRole("button", { name: "Open saved application" });
    await expect(candidatureEntries).toHaveCount(1);
    const rawOnlyEntry = candidatureEntries.first();
    await expect(rawOnlyEntry).toContainText("Retained source");
    await expect(rawOnlyEntry).toContainText("Aster Aviation seeks a captain in Madrid");
    await rawOnlyEntry.click();

    const reopened = running.page.getByRole("region", { name: "Application information" });
    const sources = reopened.getByRole("region", { name: "Sources" });
    await expect(sources).toContainText(rawMaterial);
    await sources.getByRole("button", { name: "Read source" }).click();
    await expect(sources.getByRole("article", { name: "Source content" })).toContainText(rawMaterial);
    await sources.getByRole("button", { name: "Back to Sources" }).click();

    const roleBlock = reopened.getByRole("article", { name: "Role information" });
    await roleBlock.getByRole("button", { name: "Edit Role", exact: true }).click();
    await roleBlock.getByLabel("Value").fill("Captain");
    await expect(reopened.getByRole("button", { name: "Send to my AI" })).toBeDisabled();
    await roleBlock.getByRole("button", { name: "Save", exact: true }).click();
    await expect(roleBlock).toContainText("Captain");
    const primary = reopened.getByRole("region", { name: "Starred application information" });
    const externalAi = reopened.getByRole("region", { name: "Send to my AI" });
    await expect(externalAi.getByRole("button", { name: "Send to my AI" })).toBeVisible();
    await expect(reopened.getByLabel("Task instructions")).toHaveCount(0);
    const primaryBox = await primary.boundingBox();
    const externalAiBox = await externalAi.boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(externalAiBox).not.toBeNull();
    expect(primaryBox!.y).toBeLessThan(externalAiBox!.y);''',
)
