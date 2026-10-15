import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { cvDocumentImageSchema, type CvDocumentImage } from "../shared/document-domain-contracts";

export const maximumCvImageBytes = 20_000_000;
const maximumImageSide = 8_000;
const maximumImagePixels = 24_000_000;

function contained(root: string, target: string): boolean {
  const relative = path.relative(realpathSync(root), realpathSync(target));
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

function imageDirectory(rootPath: string): string {
  const directory = path.join(rootPath, "document-images");
  mkdirSync(directory, { recursive: true });
  if (!contained(rootPath, directory)) throw new Error("The CV image folder is outside the workspace.");
  return directory;
}

export function cvImagePath(rootPath: string, image: CvDocumentImage): string {
  const parsed = cvDocumentImageSchema.parse(image);
  const file = path.join(imageDirectory(rootPath), parsed.assetId + ".png");
  try {
    if (!contained(rootPath, file) || !statSync(file).isFile()) throw new Error("unavailable");
  } catch {
    throw new Error("The CV image is unavailable. Choose another image or remove it from the CV.");
  }
  if (statSync(file).size > maximumCvImageBytes) throw new Error("The CV image is too large.");
  return file;
}

export function cvImageDimensions(bytes: Buffer): { width: number; height: number } {
  let width = 0;
  let height = 0;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString("ascii", 12, 16) === "IHDR") {
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (!width || !height) throw new Error("Choose a valid PNG or JPEG image.");
  if (width > maximumImageSide || height > maximumImageSide || width * height > maximumImagePixels) {
    throw new Error("Choose an image no larger than 8,000 pixels per side and 24 megapixels.");
  }
  return { width, height };
}

export function storeCvImage(rootPath: string, png: Buffer, name: string, mode: CvDocumentImage["mode"]): CvDocumentImage {
  if (png.length > maximumCvImageBytes) throw new Error("Choose an image smaller than 20 MB.");
  cvImageDimensions(png);
  const image = cvDocumentImageSchema.parse({ assetId: randomUUID(), name: path.basename(name).slice(0, 255), mode });
  writeFileSync(path.join(imageDirectory(rootPath), image.assetId + ".png"), png, { flag: "wx" });
  return image;
}

export function previewCvImage(rootPath: string, assetId: string): string {
  const image = cvDocumentImageSchema.parse({ assetId, name: "CV image", mode: "photo" });
  const bytes = readFileSync(cvImagePath(rootPath, image));
  cvImageDimensions(bytes);
  return "data:image/png;base64," + bytes.toString("base64");
}

export function stageCvImage(rootPath: string, image: CvDocumentImage | null | undefined, stagePath: string): void {
  if (!image) return;
  const source = cvImagePath(rootPath, image);
  cvImageDimensions(readFileSync(source));
  copyFileSync(source, path.join(stagePath, "document-image.png"));
}

export function restoreRenderedCvImage(rootPath: string, image: CvDocumentImage, projectPath: string): CvDocumentImage {
  const source = path.join(projectPath, "document-image.png");
  try {
    if (!contained(rootPath, source) || !statSync(source).isFile() || statSync(source).size > maximumCvImageBytes) throw new Error("unavailable");
  } catch {
    throw new Error("The generated CV's retained image is unavailable.");
  }
  return storeCvImage(rootPath, readFileSync(source), image.name, image.mode);
}
