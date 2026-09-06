import type { AiDesktopApi } from "../shared/ai-contracts";
import type { DesktopApi } from "../shared/contracts";
import type { TodoDesktopApi } from "../shared/todo-contracts";

declare global {
  interface Window {
    readonly aaaat: DesktopApi & AiDesktopApi & TodoDesktopApi;
  }
}

export {};
