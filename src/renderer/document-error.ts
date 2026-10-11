// One presentation-level error cleanup for Electron IPC failures.
export function readableDocumentError(reason: unknown, fallback: string): string {
  if (!(reason instanceof Error) || !reason.message.trim()) return fallback;
  return reason.message
    .replace(/^Error invoking remote method '[^']+':\s*/u, "")
    .replace(/^Error:\s*/u, "")
    .trim() || fallback;
}
