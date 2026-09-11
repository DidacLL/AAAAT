import {
  candidatureActivityCandidatureIdSchema,
  candidatureActivityChannels,
  candidatureActivityListSchema,
  type CandidatureActivityDesktopApi,
} from "../shared/candidature-activity-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCandidatureActivityDesktopApi(invoke: Invoke): CandidatureActivityDesktopApi {
  return Object.freeze({
    candidatureActivity: Object.freeze({
      list: async (candidatureId: string) =>
        candidatureActivityListSchema.parse(
          await invoke(
            candidatureActivityChannels.list,
            candidatureActivityCandidatureIdSchema.parse(candidatureId),
          ),
        ),
    }),
  });
}
