import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(process.execPath, [path.join(root, "node_modules/@electron-forge/cli/dist/electron-forge.js"), "make", ...args]);
if (process.platform === "win32") {
  const archArgument = args.find(value => value.startsWith("--arch="));
  const archIndex = args.indexOf("--arch");
  const arch = archArgument?.slice(7) ?? (archIndex >= 0 ? args[archIndex + 1] : process.arch);
  if (!["x64", "arm64"].includes(arch)) throw new Error("Windows installers support x64 and ARM64.");
  const candidates = [process.env.ISCC_PATH,
    path.join(process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)", "Inno Setup 6/ISCC.exe"),
    path.join(process.env.ProgramFiles ?? "C:/Program Files", "Inno Setup 6/ISCC.exe")];
  const compiler = candidates.find(candidate => candidate && existsSync(candidate));
  if (!compiler) throw new Error("Install Inno Setup 6, or set ISCC_PATH to its ISCC.exe compiler.");
  const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  run(compiler, [`/DAppVersion=${version}`, `/DAppArch=${arch}`,
    `/DAppSource=${path.join(root, `out/AAAAT-win32-${arch}`)}`,
    `/DInstallerOutput=${path.join(root, "out/make/setup", arch)}`,
    path.join(root, "installer/windows.iss")]);
}
