# Install AAAAT

Choose the AAAAT 2 package for your device from [Releases](https://github.com/DidacLL/AAAAT/releases).

| Device | Package | Installation |
| --- | --- | --- |
| Windows 10 or later, x64 / ARM64 | `AAAAT-windows-…-setup.exe` | Open setup; AAAAT installs for your account. Choose the native architecture where possible. |
| macOS Intel / Apple Silicon | `AAAAT-macos-….dmg` | Open the disk image and drag AAAAT to Applications. |
| Ubuntu / Debian x64 / ARM64 | `AAAAT-linux-….deb` | Open with your system's package installer. |

Portable ZIPs are also built for each platform. Installed packages include the application runtime; Node.js and npm are not installation requirements. The Windows minimum follows Electron's Windows 10 baseline. Packages are unsigned: operating-system checks may require you to allow AAAAT to open. There is no automatic updater. Removing the app does not remove your separately chosen workspace.

## Two optional extras

On a fresh installed launch, choose either, both or neither. **Not now** takes you straight to AAAAT. You can return through **Settings → AI → Local AI** or **Settings → Documents → PDF setup**.

**Local AI** downloads the official llama.cpp CPU runtime and IBM Granite 4.1 3B Q4_K_M, approximately 2 GB. This is the model tested with AAAAT. It runs on your computer; speed depends on your hardware. The installed server starts with AAAAT and stops when you quit. **Settings → AI → Startup** provides an editable script, an on/off choice and **Use installed default**. Saved changes apply on the next launch. The generated default includes the installed executable and model paths; advanced users can configure their own setup. Startup scripts run locally with your account privileges and are not editable by connected AI tools. New workspaces without an AI connection receive it automatically. Explicit Local AI setup adds its connection when needed, preserving the current default. Opening a workspace does not repeatedly restore deliberately removed connections. **Locations** lets you edit download/tool folders and select a pdfLaTeX executable; changes affect future downloads/installations and leave existing files in place.

On Windows, Local AI checks whether llama.cpp can start with the available runtime. A working installation is reused, without imposing a version threshold. If Windows reports a missing runtime DLL or DLL entry point, Microsoft's own setup opens with its license and permission choices; AAAAT does not approve these for you.

**PDF generation** uses an existing pdfLaTeX installation where available. Otherwise it installs:

| Device | PDF tool |
| --- | --- |
| Windows 10 or later on x64; Windows 11 on ARM64 through x64 emulation | MiKTeX |
| macOS Intel | MiKTeX |
| Apple Silicon | BasicTeX, the small TeX Live distribution |
| Linux x64 / ARM64 | Native TeX Live through the system software manager |

PDF setup opens the third-party native installer or software manager. On Linux, AAAAT asks the [system’s APT link handler](https://help.ubuntu.com/community/AptURL) to install TeX Live; if none is available, use the system software manager to install TeX Live. AAAAT does not add package repositories, manipulate keys, run package updates or accept third-party license choices. Existing compatible pdfLaTeX installations remain usable. MiKTeX is a default, not a requirement.

You can cancel a download or continue using AAAAT while setup runs. Once native installation starts, allow it to finish. A failed optional download leaves completed tools available and does not prevent manual work. Setup errors remain visible so you can retry.

## Sources and advanced details

Downloads come from [llama.cpp](https://github.com/ggml-org/llama.cpp/releases/tag/b11429), [IBM Granite](https://huggingface.co/ibm-granite/granite-4.1-3b-GGUF), [MiKTeX](https://miktex.org/download) and [BasicTeX](https://www.tug.org/mactex/morepackages.html). llama.cpp uses the MIT license; Granite uses Apache 2.0. TeX distributions contain components under their own published licenses.

The Windows prerequisite comes from [Microsoft's Visual C++ redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). Setup pins version 14.50, matching the working Windows runtime used with the tested Granite model, and verifies the download digest. Microsoft's x64 package also supplies ARM64 binaries on ARM64 Windows.

AAAAT pins the CPU runtime and exact tested GGUF revision and verifies downloaded archives against their published hashes. The initial tool/download location is local application data, outside the career workspace; both folders are editable under **Locations**. The generated startup script defaults to `127.0.0.1:47842` and is fully editable for the user’s setup.

An independently installed compatible AI or TeX installation remains supported. AAAAT does not change your system PATH or overwrite your selected AI defaults. Building installers yourself is described in the [README](../README.md#build-from-source).
