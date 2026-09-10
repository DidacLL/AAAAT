import {
  candidatureExternalAccessChannels,
  candidatureExternalAccessSchema,
  candidatureExternalAccessUpdateSchema,
  type CandidatureExternalAccessDesktopApi,
} from "../shared/candidature-external-access-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCandidatureExternalAccessDesktopApi(
  invoke: Invoke,
): CandidatureExternalAccessDesktopApi {
  return Object.freeze({
    candidatureExternalAccess: Object.freeze({
      current: async (candidatureId: string) =>
        candidatureExternalAccessSchema.parse(
          await invoke(
            candidatureExternalAccessChannels.current,
            candidatureExternalAccessSchema.shape.candidatureId.parse(candidatureId),
          ),
        ),
      update: async (
        input: Parameters<CandidatureExternalAccessDesktopApi["candidatureExternalAccess"]["update"]>[0],
      ) =>
        candidatureExternalAccessSchema.parse(
          await invoke(
            candidatureExternalAccessChannels.update,
            candidatureExternalAccessUpdateSchema.parse(input),
          ),
        ),
    }),
  });
}
