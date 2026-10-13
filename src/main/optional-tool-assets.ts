// Fixed official downloads. The Granite hash also matches the model used in
// the owner's real desktop review. These are installer inputs, not providers.
export const graniteModel = Object.freeze({
  filename: "granite-4.1-3b-Q4_K_M.gguf",
  url: "https://huggingface.co/ibm-granite/granite-4.1-3b-GGUF/resolve/ab4701481089b58a082ef63cc1cee738887293ff/granite-4.1-3b-Q4_K_M.gguf",
  hash: "662b0626cd58f443baea23559b469df6576a81d349649c59413b36a9fb32eb29",
  size: 2099501664,
});

const llamaRelease = "https://github.com/ggml-org/llama.cpp/releases/download/b11429/";
export const llamaCpuArchives: Readonly<Record<string, { filename: string; url: string; hash: string }>> = Object.freeze({
  "win32-x64": { filename: "llama-win-x64.zip", url: `${llamaRelease}llama-b11429-bin-win-cpu-x64.zip`, hash: "1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe" },
  "win32-arm64": { filename: "llama-win-arm64.zip", url: `${llamaRelease}llama-b11429-bin-win-cpu-arm64.zip`, hash: "ee0f631a9e58b146ff50714099d9cb498906af3143a773b580093a9214a8d1e5" },
  "darwin-x64": { filename: "llama-mac-x64.tar.gz", url: `${llamaRelease}llama-b11429-bin-macos-x64.tar.gz`, hash: "29ac3ea02be6bd143e824973f2cc5fa74bc4094393a9eaab0ff6814f19dd8522" },
  "darwin-arm64": { filename: "llama-mac-arm64.tar.gz", url: `${llamaRelease}llama-b11429-bin-macos-arm64.tar.gz`, hash: "740288ec6887be94280a5dfa25b5e23a78285cab104519e6c7e218904ee82459" },
  "linux-x64": { filename: "llama-linux-x64.tar.gz", url: `${llamaRelease}llama-b11429-bin-ubuntu-x64.tar.gz`, hash: "f6d25dde8f51133143d1453da4fd5f73b145127177612a283bf7995957af3392" },
  "linux-arm64": { filename: "llama-linux-arm64.tar.gz", url: `${llamaRelease}llama-b11429-bin-ubuntu-arm64.tar.gz`, hash: "ed44c0f79c3d02424f62bdc87e106318b0b89f49050e2e80c5f352723d14e00b" },
});

export const miktexWindows = Object.freeze({
  filename: "basic-miktex-25.12-x64.exe",
  url: "https://miktex.org/download/ctan/systems/win32/miktex/setup/windows-x64/basic-miktex-25.12-x64.exe",
  hash: "14b42dd9f4b4a7813a8bfd69c8f99316c2888cc4ee26f631f397e163d85d6c62",
});
export const miktexMac = Object.freeze({
  filename: "miktex-22.1-darwin-x86_64.dmg",
  url: "https://miktex.org/download/ctan/systems/win32/miktex/setup/darwin-x86_64/miktex-22.1-darwin-x86_64.dmg",
  hash: "a5b531a60fc51c1f01c1af46bf859863c6974ef8d71213e476642acb788a4e4f",
});
export const basicTexMac = Object.freeze({
  filename: "mactex-basictex-20260301.pkg",
  url: "https://mirrors.ctan.org/systems/mac/mactex/mactex-basictex-20260301.pkg",
  hash: "624b7baf5d9fda23292596038f98d2261239df3d491296d8f6e754e5403940ba8cfa25fc24d52810e88f571fb768cea54a24ea531b6db2acf8c4f86a1f7a5edd",
  algorithm: "sha512" as const,
});
