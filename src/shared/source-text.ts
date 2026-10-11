// Retained Sources belong to the user. Do not infer which lines or markup are disposable.
// Normalizing line endings is presentation-only; the original Source remains persisted unchanged.
export function readableSourceText(raw: string): string {
  return raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

export const compactSourceText = readableSourceText;
