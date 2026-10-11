const blockBreak = /<\/?(?:address|article|aside|blockquote|div|footer|h[1-6]|header|li|main|nav|ol|p|pre|section|table|td|th|tr|ul)\b[^>]*>/gi;
const lineBreak = /<br\s*\/?\s*>/gi;
const hiddenMarkup = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const comments = /<!--[\s\S]*?-->/g;
const tags = /<[^>]+>/g;
const obviousChrome = /^(?:accept(?: all)? cookies?|cookie preferences?|privacy settings?|sign in|log in|register|save job|share job|apply now|back to jobs|skip to (?:main )?content|navigation|menu)$/i;

function decodeEntity(entity: string): string {
  const named: Readonly<Record<string, string>> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
  };
  const direct = named[entity.toLocaleLowerCase()];
  if (direct !== undefined) return direct;
  const decimal = /^&#(\d+);$/.exec(entity);
  const hex = /^&#x([0-9a-f]+);$/i.exec(entity);
  const codePoint = decimal ? Number(decimal[1]) : hex ? Number.parseInt(hex[1] ?? "", 16) : Number.NaN;
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
  try { return String.fromCodePoint(codePoint); } catch { return entity; }
}

function stripMarkup(raw: string): string {
  return raw
    .replace(comments, " ")
    .replace(hiddenMarkup, " ")
    .replace(lineBreak, "\n")
    .replace(blockBreak, "\n")
    .replace(tags, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#\d+|#x[0-9a-f]+);/gi, decodeEntity)
    .replaceAll("\u00a0", " ")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");
}

function normalizeLines(raw: string): string[] {
  return stripMarkup(raw)
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean);
}

export function readableSourceText(raw: string): string {
  return normalizeLines(raw).join("\n\n");
}

export function compactSourceText(raw: string): string {
  const seen = new Set<string>();
  const retained: string[] = [];
  for (const line of normalizeLines(raw)) {
    if (line.length <= 80 && obviousChrome.test(line)) continue;
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    retained.push(line);
  }
  return retained.join("\n");
}
