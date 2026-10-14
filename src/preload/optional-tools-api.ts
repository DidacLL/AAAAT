import { optionalToolsChannels, optionalToolsChoiceSchema, optionalToolsStatusSchema, localAiStartupInputSchema, localAiStartupSettingsSchema, toolLocationsSchema, toolPathKindSchema, type ToolLocations, type LocalAiStartupInput, type OptionalToolsChoice, type OptionalToolsDesktopApi } from "../shared/optional-tools-contracts";
import { z } from "zod";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createOptionalToolsApi(invoke: Invoke): OptionalToolsDesktopApi {
  return Object.freeze({ optionalTools: Object.freeze({
    current: async () => optionalToolsStatusSchema.parse(await invoke(optionalToolsChannels.current)),
    install: async (choice: OptionalToolsChoice) => optionalToolsStatusSchema.parse(await invoke(optionalToolsChannels.install, optionalToolsChoiceSchema.parse(choice))),
    cancel: async () => { await invoke(optionalToolsChannels.cancel); },
    dismiss: async () => { await invoke(optionalToolsChannels.dismiss); },
    startupCurrent: async () => localAiStartupSettingsSchema.parse(await invoke(optionalToolsChannels.startupCurrent)),
    startupSave: async (input: LocalAiStartupInput) => localAiStartupSettingsSchema.parse(await invoke(optionalToolsChannels.startupSave, localAiStartupInputSchema.parse(input))),
    locationsSave: async (input: ToolLocations) => { await invoke(optionalToolsChannels.locationsSave, toolLocationsSchema.parse(input)); },
    choosePath: async (kind: "directory" | "pdflatex") => z.string().nullable().parse(await invoke(optionalToolsChannels.choosePath, toolPathKindSchema.parse(kind))),
  }) });
}
