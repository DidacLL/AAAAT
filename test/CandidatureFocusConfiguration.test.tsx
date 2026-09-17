import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidatureFocusConfiguration } from "../src/renderer/CandidatureFocusConfiguration";
import type { CandidatureFieldConfiguration } from "../src/shared/contracts";

function field(
  id: string,
  label: string,
  focusVisible: boolean,
  focusOrder: number | null,
): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: "",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    },
    preferences: {
      fieldId: id,
      focusVisible,
      focusOrder,
      focusProminence: "normal",
      identityOrder: null,
      aiUseAllowed: false,
    },
  };
}

const role = field("00000000-0000-4000-8000-000000000501", "Role", true, 0);
const location = field("00000000-0000-4000-8000-000000000502", "Location", false, null);

function Harness() {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([role, location]);
  return (
    <CandidatureFocusConfiguration
      fields={fields}
      onChanged={(updated) => {
        setFields((current) => current.map((candidate) =>
          candidate.definition.id === updated.definition.id ? updated : candidate,
        ));
      }}
    />
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Focus information configuration", () => {
  it("persists visibility and order through the existing field preference API", async () => {
    const saved = new Map([role, location].map((candidate) => [candidate.definition.id, candidate]));
    const updateFieldPreferences = vi.fn(async (preferences: CandidatureFieldConfiguration["preferences"]) => {
      const current = saved.get(preferences.fieldId);
      if (!current) throw new Error("missing field");
      const next = { ...current, preferences: { ...preferences } };
      saved.set(preferences.fieldId, next);
      return next;
    });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { candidatures: { updateFieldPreferences } },
    });

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Choose Focus information"));

    await user.click(screen.getByRole("checkbox", { name: "Location" }));
    await waitFor(() => expect(updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
      fieldId: location.definition.id,
      focusVisible: true,
      focusOrder: 1,
    })));

    await user.click(screen.getByRole("button", { name: "Move Location up in Focus" }));
    await waitFor(() => {
      expect(updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
        fieldId: location.definition.id,
        focusOrder: 0,
      }));
      expect(updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
        fieldId: role.definition.id,
        focusOrder: 1,
      }));
    });
  });
});
