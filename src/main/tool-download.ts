import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";

interface ToolDownload {
  readonly filename: string;
  readonly url: string;
  readonly hash: string;
  readonly algorithm?: "sha512";
}

export async function fileHasHash(filename: string, expected: string, algorithm = "sha256"): Promise<boolean> {
  try {
    const hash = createHash(algorithm);
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    return hash.digest("hex") === expected;
  } catch { return false; }
}

export async function downloadTool(
  directory: string,
  source: ToolDownload,
  signal: AbortSignal,
  progress: (received: number, total: number) => void,
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, source.filename);
  const algorithm = source.algorithm ?? "sha256";
  if (await fileHasHash(target, source.hash, algorithm)) return target;
  signal.throwIfAborted();
  const response = await fetch(source.url, { signal });
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}). Please retry.`);
  const partial = `${target}.partial`;
  const file = await open(partial, "w");
  const reader = response.body.getReader();
  const hash = createHash(algorithm);
  const total = Number(response.headers.get("content-length")) || 0;
  let received = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      hash.update(chunk.value);
      const bytes = Buffer.from(chunk.value);
      let offset = 0;
      while (offset < bytes.length) offset += (await file.write(bytes, offset, bytes.length - offset)).bytesWritten;
      received += bytes.length;
      progress(received, total);
    }
    if (hash.digest("hex") !== source.hash) throw new Error("The download did not match the official file. Please retry.");
    await file.close();
    await rename(partial, target);
    return target;
  } catch (reason) {
    await reader.cancel().catch(() => undefined);
    await file.close().catch(() => undefined);
    await unlink(partial).catch(() => undefined);
    throw reason;
  }
}
