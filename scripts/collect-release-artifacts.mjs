import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf("--" + name);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error("Missing --" + name + " argument.");
  }
  return process.argv[index + 1];
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

const platform = argument("platform");
const arch = argument("arch");
const platformNames = {
  win32: "windows",
  darwin: "macos",
  linux: "linux",
};
const platformName = platformNames[platform];
if (!platformName) {
  throw new Error("Unsupported platform label: " + platform);
}

const sourceDirectory = path.resolve("out", "make");
const outputDirectory = path.resolve("release-artifacts");
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const distributables = filesUnder(sourceDirectory).filter((file) => {
  const extension = path.extname(file).toLowerCase();
  return extension === ".zip" || extension === ".deb";
});
if (distributables.length === 0) {
  throw new Error("No .zip or .deb distributables found under " + sourceDirectory);
}

const usedNames = new Set();
for (const source of distributables) {
  const extension = path.extname(source).toLowerCase();
  const targetName = "AAAAT-" + platformName + "-" + arch + extension;
  if (usedNames.has(targetName)) {
    throw new Error("Multiple distributables would map to " + targetName);
  }
  usedNames.add(targetName);

  const target = path.join(outputDirectory, targetName);
  copyFileSync(source, target);
  const bytes = readFileSync(target);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  writeFileSync(target + ".sha256", sha256 + "  " + targetName + "\n", "utf8");
  process.stdout.write(
    targetName + "  " + statSync(target).size + " bytes  sha256=" + sha256 + "\n",
  );
}
