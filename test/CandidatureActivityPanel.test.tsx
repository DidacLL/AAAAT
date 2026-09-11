import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureActivityPanel } from "../src/renderer/CandidatureActivityPanel";

const candidatureId = "00000000-0000-4000-8000-000000000901";
const listActivity = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  listActivity.mockResolvedValue([
    { occurredAt: "2026-09-11T12:00:00.000Z", kind: "source_added" },
    { occurredAt: "2026-09-11T11:00:00.000Z", kind: "changed" },
  ]);
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { candidatureActivity: { list: listActivity } },
  });
});

afterEach(() => cleanup());

describe("secondary candidature Activity", () => {
  it("loads only when deliberately opened and renders presentation labels instead of protocol actions", async () => {
    const user = userEvent.setup();
    render(<CandidatureActivityPanel candidatureId={candidatureId} />);

    expect(listActivity).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Candidature Activity")).not.toBeVisible();

    await user.click(screen.getByText("Activity", { selector: "summary" }));

    expect(await screen.findByText("Source added")).toBeInTheDocument();
    expect(screen.getByText("Candidature changed")).toBeInTheDocument();
    expect(screen.queryByText("candidature.source-added")).not.toBeInTheDocument();
    expect(listActivity).toHaveBeenCalledWith(candidatureId);
  });

  it("keeps the secondary surface usable when Activity cannot load", async () => {
    listActivity.mockRejectedValue(new Error("read failed"));
    const user = userEvent.setup();
    render(<CandidatureActivityPanel candidatureId={candidatureId} />);

    await user.click(screen.getByText("Activity", { selector: "summary" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AAAAT could not load candidature Activity.",
    );
    expect(screen.getByText("Activity", { selector: "summary" })).toBeVisible();
  });
});
