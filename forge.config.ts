import { existsSync } from "node:fs";
import path from "node:path";

import type { ForgeConfig } from "@electron-forge/shared-types";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

function ensureWindowsPowerShellOnPath(): void {
  if (process.platform !== "win32") return;

  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot) return;

  const powershellDirectory = path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
  );
  if (!existsSync(path.join(powershellDirectory, "powershell.exe"))) return;

  const currentPath = process.env.PATH ?? "";
  const normalizedDirectory = powershellDirectory.toLowerCase();
  const alreadyPresent = currentPath
    .split(path.delimiter)
    .some((entry) => entry.toLowerCase() === normalizedDirectory);
  if (!alreadyPresent) {
    process.env.PATH = currentPath
      ? `${powershellDirectory}${path.delimiter}${currentPath}`
      : powershellDirectory;
  }
}

ensureWindowsPowerShellOnPath();

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: "aaaat",
    name: "AAAAT",
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "darwin"],
      config: {},
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        options: {
          maintainer: "AAAAT contributors",
          homepage: "https://github.com/DidacLL/AAAAT",
        },
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/entry.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
