import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { CandidatureFieldValueEditor } from "../src/renderer/CandidatureFieldValueEditor";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../src/shared/contracts";

const fieldId = "00000000-0000-4000-8000-000000000901";
const remoteId = "00000000-0000-4000-8000-000000000902";
const hybridId = "00000000-0000-4000-8000-000000000903";

function field(
  valueType: CandidatureFieldConfiguration["definition"]["valueType"],
  cardinality: CandidatureFieldConfiguration["definition"]["cardinality"] = "one",
): CandidatureFieldConfiguration {
  return {
    definition: {
      id: fieldId,
      systemKey: null,
      label: "Availability",
      description: "When the user can start",
      valueType,
      cardinality,
      choices:
        valueType === "choice"
          ? [
              { id: remoteId, label: "Remote" },
              { id: hybridId, label: "Hybrid" },
            ]
          : [],
      enabled: true,
      createdAt: "2026-09-11T00:00:00.000Z",
      updatedAt: "2026-09-11T00:00:00.000Z",
    },
    preferences: {
      fieldId,
      focusVisible: false,
      focusOrder: null,
      focusProminence: "normal",
      identityOrder: null,
      aiDiscovery: false,
      aiContextMode: "omit",
    },
  };
}

function StatefulEditor({
  configuration,
  initialValue,
  onClear = vi.fn(async () => undefined),
  onDiscover = vi.fn(async () => undefined),
  onDirtyChange,
}: {
  readonly configuration: CandidatureFieldConfiguration;
  readonly initialValue: CandidatureRuntimeValue;
  readonly onClear?: () => Promise<void>;
  readonly onDiscover?: () => Promise<void>;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState<CandidatureRuntimeValue | undefined>(initialValue);
  return (
    <CandidatureFieldValueEditor
      field={configuration}
      value={value}
      onSave={async (next) => setValue(next)}
      onClear={async () => {
        await onClear();
        setValue(undefined);
      }}
      onDiscover={onDiscover}
      onDirtyChange={onDirtyChange}
    />
  );
}

afterEach(() => cleanup());

describe("read-first candidature information value", () => {
  it("shows retained text as readable content until Edit is deliberate", async () => {
    const user = userEvent.setup();
    render(<StatefulEditor configuration={field("text")} initialValue="October or November" />);

    expect(screen.getByText("October or November", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discover from Sources" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("October or November");
    await user.clear(input);
    await user.type(input, "October through December");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("October through December", { exact: true })).toBeInTheDocument();
  });

  it("renders choice labels and booleans rather than storage-shaped values", () => {
    render(
      <StatefulEditor
        configuration={field("choice", "many")}
        initialValue={[remoteId, hybridId]}
      />,
    );
    expect(screen.getByText("Remote, Hybrid", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    cleanup();
    render(<StatefulEditor configuration={field("boolean")} initialValue={true} />);
    expect(screen.getByText("Yes", { exact: true })).toBeInTheDocument();
  });

  it("keeps clear, discovery, cancel and dirty reporting local to deliberate edit mode", async () => {
    const user = userEvent.setup();
    const clear = vi.fn(async () => undefined);
    const discover = vi.fn(async () => undefined);
    const dirty = vi.fn();
    render(
      <StatefulEditor
        configuration={field("text")}
        initialValue="October"
        onClear={clear}
        onDiscover={discover}
        onDirtyChange={dirty}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByRole("textbox");
    await user.type(input, " onward");
    expect(dirty).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Discover from Sources" }));
    expect(discover).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("October", { exact: true })).toBeInTheDocument();
    expect(dirty).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
