# Install AAAAT

The v2 preview has no published release yet. Native packages are being prepared; when available, choose the file for your device from [Releases](https://github.com/DidacLL/AAAAT/releases).

| Device | Package | Installation |
| --- | --- | --- |
| Windows 11 x64 / ARM64 | `AAAAT-windows-…-setup.exe` | Open setup; AAAAT installs for your account. |
| macOS Intel / Apple Silicon | `AAAAT-macos-….dmg` | Open the disk image and drag AAAAT to Applications. |
| Ubuntu / Debian x64 / ARM64 | `AAAAT-linux-….deb` | Open with your system's package installer. |

Portable ZIPs are also built for each platform. Preview packages are unsigned: operating-system checks may require you to allow this preview to open. There is no automatic updater. Removing the app does not remove your separately chosen workspace.

## Two optional extras

On a fresh installed launch, choose either, both or neither. **Not now** takes you straight to AAAAT. You can return through **Settings → AI → Local AI** or **Settings → Documents → PDF setup**.

**Local AI** downloads the official llama.cpp CPU runtime and IBM Granite 4.1 3B Q4_K_M, approximately 2 GB. This is the model tested with AAAAT. It runs on your computer; speed depends on your hardware. The installed server starts with AAAAT and stops when you quit. **Settings → AI → Startup** provides an editable script, an on/off choice and **Use installed default**. Saved changes apply on the next launch. The generated default includes the installed executable and model paths; advanced users can configure their own setup. Startup scripts run locally with your account privileges and are not editable by connected AI tools. New workspaces without an AI connection receive it automatically. Existing connections and manually deleted connections remain as you chose them.

**PDF generation** uses an existing pdfLaTeX installation where available. Otherwise it installs:

| Device | PDF tool |
| --- | --- |
| Windows 11, including ARM64 through Windows x64 support | MiKTeX |
| macOS Intel | MiKTeX |
| Apple Silicon | BasicTeX, the small TeX Live distribution |
| Ubuntu / Debian x64 | MiKTeX |
| Ubuntu / Debian ARM64 | Native TeX Live |

Automatic Linux PDF setup supports Ubuntu 22.04, 24.04 and 26.04, corresponding Linux Mint releases, and Debian 11–13. It uses the system package manager and may ask for administrator authorization. BasicTeX installation also uses macOS authorization. MiKTeX installs for your account. Fonts and language packages may download when needed for PDF generation.

You can cancel a download or continue using AAAAT while setup runs. Once native installation starts, allow it to finish. A failed optional download leaves completed tools available and does not prevent manual work. Setup errors remain visible so you can retry.

## Sources and advanced details

Downloads come from [llama.cpp](https://github.com/ggml-org/llama.cpp/releases/tag/b11429), [IBM Granite](https://huggingface.co/ibm-granite/granite-4.1-3b-GGUF), [MiKTeX](https://miktex.org/download) and [BasicTeX](https://www.tug.org/mactex/morepackages.html). llama.cpp uses the MIT license; Granite uses Apache 2.0. TeX distributions contain components under their own published licenses.

AAAAT pins the CPU runtime and exact tested GGUF revision and verifies downloaded archives against their published hashes. It keeps these files in its local application-data directory, outside your career workspace. Its local server listens only on `127.0.0.1`, at port `47842`. There is no public network listener, model marketplace or general server-management system.

An independently installed compatible AI or TeX installation remains supported. AAAAT does not change your system PATH or overwrite your selected AI defaults. Building installers yourself is described in the [README](../README.md#run-the-current-preview).
