// @vitest-environment node
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, it } from "vitest";
import { createAaaatMcpServer } from "../../src/main/mcp-server";
import { evalEnabled } from "./eval-runtime";
import { runMcpSuite } from "./mcp-journey-runner";

describe.runIf(evalEnabled)("AAAAT current production MCP journeys", () => {
  it("runs every selected journey and scenario against the model and checks retained workspace state", async () => {
    await runMcpSuite("mcp", async (root) => {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createAaaatMcpServer(root);
      const client = new Client({ name: "aaaat-ai-journey-evaluator", version: "1.0.0" });
      await server.connect(serverTransport);
      try { await client.connect(clientTransport); }
      catch (reason) {
        await server.close().catch(() => undefined);
        throw reason;
      }
      return {
        client,
        close: async () => {
          await client.close();
          await server.close();
        },
      };
    });
  }, 14_400_000);
});
