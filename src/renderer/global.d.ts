import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";
import type { AiDesktopApi } from "../shared/ai-contracts";
import type { ArtifactDesktopApi } from "../shared/artifact-contracts";
import type { CandidatureSearchDesktopApi } from "../shared/candidature-search-contracts";
import type { CombinedDocumentDesktopApi } from "../shared/combined-document-contracts";
import type { DesktopApi } from "../shared/contracts";
import type { CvContentAccessDesktopApi } from "../shared/cv-content-access-contracts";
import type { CvDescriptorDesktopApi } from "../shared/cv-descriptor-contracts";
import type { FocusDesktopApi } from "../shared/focus-contracts";
import type { SetupEnvironmentDesktopApi } from "../shared/setup-environment-contracts";
import type { TodoDesktopApi } from "../shared/todo-contracts";
import type { WorkspaceRecoveryDesktopApi } from "../shared/workspace-recovery-contracts";

declare global {
  interface Window {
    readonly aaaat: DesktopApi &
      AiDesktopApi &
      AiConnectionDesktopApi &
      ArtifactDesktopApi &
      CandidatureSearchDesktopApi &
      CombinedDocumentDesktopApi &
      CvContentAccessDesktopApi &
      CvDescriptorDesktopApi &
      TodoDesktopApi &
      FocusDesktopApi &
      SetupEnvironmentDesktopApi &
      WorkspaceRecoveryDesktopApi;
  }
}

export {};
