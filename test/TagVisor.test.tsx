import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagVisor } from "../src/renderer/TagVisor";
import type { TagRecord } from "../src/shared/contracts";

const reliability: TagRecord = {
  id: "00000000-0000-4000-8000-000000003690",
  name: "Reliability engineering",
  aliases: ["SRE", "Site reliability"],
  definition: "Operating dependable production systems",
  notes: "Ask about incident ownership",
};
const operations: TagRecord = {
  id: "00000000-0000-4000-8000-000000003691",
  name: "Platform operations",
  aliases: ["Ops"],
  definition: "Operational ownership of the platform",
};

function installListTags(listTags: ReturnType<typeof vi.fn>) {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { candidatures: { listTags } },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Tag visor", () => {
  it("keeps an empty query compact, finds canonical names and aliases, and reads shared meaning", async () => {
    installListTags(vi.fn(async () => [reliability, operations]));
    const user = userEvent.setup();
    render(<TagVisor workspaceKey="workspace-a" refreshRevision={0} />);

    expect(await screen.findByText("Search names or aliases.")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Tag search results" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: reliability.name })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: operations.name })).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Search Tags" });
    await user.type(search, "  reliability  ");
    expect(screen.getByRole("button", { name: reliability.name })).toBeVisible();

    await user.clear(search);
    await user.type(search, "sRe");
    await user.click(screen.getByRole("button", { name: reliability.name }));

    const selected = screen.getByRole("article", { name: "Selected Tag" });
    expect(selected).toHaveTextContent("Reliability engineering");
    expect(selected).toHaveTextContent("SRE, Site reliability");
    expect(selected).toHaveTextContent("Operating dependable production systems");
    expect(selected).toHaveTextContent("Ask about incident ownership");
  });

  it("shows compact empty and failure states without exposing a permanent glossary", async () => {
    installListTags(vi.fn(async () => []));
    const { unmount } = render(<TagVisor workspaceKey="empty" refreshRevision={0} />);
    expect(await screen.findByText("No Tags in this workspace yet.")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Tag search results" })).not.toBeInTheDocument();
    unmount();

    installListTags(vi.fn(async () => { throw new Error("unavailable"); }));
    render(<TagVisor workspaceKey="failed" refreshRevision={0} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tags are unavailable.");
    expect(screen.getByRole("searchbox", { name: "Search Tags" })).toBeVisible();
  });

  it("refreshes an already selected Tag in place when the glossary revision changes", async () => {
    let current = [reliability];
    const listTags = vi.fn(async () => current);
    installListTags(listTags);
    const user = userEvent.setup();
    const { rerender } = render(<TagVisor workspaceKey="workspace-a" refreshRevision={0} />);

    await user.type(screen.getByRole("searchbox", { name: "Search Tags" }), "SRE");
    await user.click(await screen.findByRole("button", { name: reliability.name }));
    expect(screen.getByRole("article", { name: "Selected Tag" })).toHaveTextContent(reliability.definition);

    current = [{ ...reliability, definition: "Dependable services with explicit operational ownership" }];
    rerender(<TagVisor workspaceKey="workspace-a" refreshRevision={1} />);

    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Selected Tag" }))
        .toHaveTextContent("Dependable services with explicit operational ownership");
    });
    expect(listTags).toHaveBeenCalledTimes(2);
  });
});
