import { optionalToolsChannels, optionalToolsChoiceSchema, optionalToolsStatusSchema, type OptionalToolsChoice, type OptionalToolsDesktopApi } from "../shared/optional-tools-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createOptionalToolsApi(invoke: Invoke): OptionalToolsDesktopApi {
  return Object.freeze({ optionalTools: Object.freeze({
    current: async () => optionalToolsStatusSchema.parse(await invoke(optionalToolsChannels.current)),
    install: async (choice: OptionalToolsChoice) => optionalToolsStatusSchema.parse(await invoke(optionalToolsChannels.install, optionalToolsChoiceSchema.parse(choice))),
    cancel: async () => { await invoke(optionalToolsChannels.cancel); },
    dismiss: async () => { await invoke(optionalToolsChannels.dismiss); },
  }) });
}
