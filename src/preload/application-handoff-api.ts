import {
  applicationHandoffChannels,
  applicationHandoffImportResultSchema,
  type ApplicationHandoffDesktopApi,
} from "../shared/application-handoff-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createApplicationHandoffDesktopApi(
  invoke: Invoke,
): ApplicationHandoffDesktopApi {
  return Object.freeze({
    applicationHandoff: Object.freeze({
      importFile: async () =>
        applicationHandoffImportResultSchema.parse(
          await invoke(applicationHandoffChannels.importFile),
        ),
    }),
  });
}
