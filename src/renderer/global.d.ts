import type { AiDesktopApi } from "../shared/ai-contracts";
import type { DesktopApi } from "../shared/contracts";

declare global {
  interface Window {
    readonly aaaat: DesktopApi & AiDesktopApi;
  }
}

export {};
