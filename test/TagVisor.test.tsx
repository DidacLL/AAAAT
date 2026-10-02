import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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

afterEach(() => {
  cleanup();
});

describe("contextual Tag visor", () => {
  it("shows a quiet neutral state and no generic Tag search workflow", () => {
    render(<TagVisor applicationContext={null} />);

    expect(screen.getByRole("region", { name: "Tags glossary" })).toHaveTextContent(
      "Select an application to inspect its Tags",
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reads the selected application's attached Tags and shared definitions automatically", () => {
    render(
      <TagVisor applicationContext={{
        candidatureId: "00000000-0000-4000-8000-000000003699",
        tags: [reliability, operations],
      }} />,
    );

    const monitor = screen.getByRole("region", { name: "Tags glossary" });
    expect(monitor).toHaveTextContent(reliability.name);
    expect(monitor).toHaveTextContent(reliability.definition);
    expect(monitor).toHaveTextContent("SRE, Site reliability");
    expect(monitor).toHaveTextContent(operations.name);
    expect(monitor).toHaveTextContent(operations.definition);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("follows application context changes without becoming a mutation surface", () => {
    const { rerender } = render(
      <TagVisor applicationContext={{
        candidatureId: "00000000-0000-4000-8000-000000003699",
        tags: [reliability],
      }} />,
    );
    expect(screen.getByRole("region", { name: "Tags glossary" })).toHaveTextContent(reliability.name);

    rerender(
      <TagVisor applicationContext={{
        candidatureId: "00000000-0000-4000-8000-000000003700",
        tags: [operations],
      }} />,
    );
    const monitor = screen.getByRole("region", { name: "Tags glossary" });
    expect(monitor).not.toHaveTextContent(reliability.name);
    expect(monitor).toHaveTextContent(operations.name);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
