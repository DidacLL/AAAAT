# Install AAAAT

Choose the AAAAT 2 package for your device from [the download page](https://didacll.github.io/AAAAT/download.html) or [v2.0.0 Releases](https://github.com/DidacLL/AAAAT/releases/tag/v2.0.0). See [Get Started](https://didacll.github.io/AAAAT/get-started.html) for your first workspace and independent application/document tasks.

| Device | Package | Installation |
| --- | --- | --- |
| Windows 10 or later, x64 / ARM64 | `AAAAT-windows-…-setup.exe` | Open setup; AAAAT installs for your account. Choose the native architecture where possible. |
| macOS Intel / Apple Silicon | `AAAAT-macos-….dmg` | Open the disk image and drag AAAAT to Applications. |
| Ubuntu / Debian x64 / ARM64 | `AAAAT-linux-….deb` | Open with your system's package installer. |

Portable ZIPs are also built for each platform. Installed packages include the application runtime; Node.js and npm are not installation requirements. The Windows minimum follows Electron's Windows 10 baseline. Packages are unsigned: operating-system checks may require you to allow AAAAT to open. There is no automatic updater. Removing the app does not remove your separately chosen workspace.

## What you need

AAAAT itself is an installed desktop application: you do not need Node.js, npm, a model provider, a TeX compiler, or a paid service simply to use its Applications, My information and document editors. Download the package matching your CPU and operating system. The distributed packages cover Windows 10 or later on x64/ARM64, Intel and Apple Silicon macOS, and Debian/Ubuntu-compatible Linux on x64/ARM64.

Two capabilities have separate requirements:

- **Local AI assistance** uses the supplied CPU build of llama.cpp and the tested **IBM Granite 4.1 3B Q4_K_M** model. Plan for approximately **2 GB of download** plus disk space for the runtime and memory while it runs. Response speed varies by hardware; AAAAT makes no guaranteed inference-speed or RAM-minimum claim. The setup screen indicates when its local package is unavailable for your device. Internet access is needed for the initial download. An independently managed compatible AI service or a text-capable LLM used through copy/paste is an alternative.
- **PDF generation** requires the **pdfLaTeX executable, `pdflatex`**, from a compatible TeX distribution. AAAAT can find an existing installation or offer platform-specific native setup. A generic PDF reader, PDF printer or word processor is not a substitute for `pdflatex`. You do not need to know LaTeX to edit a document and generate a PDF with AAAAT.

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

## Reuse your own TeX installation

1. Open **Settings → Documents → PDF setup**. In the **Make AAAAT ready for you** dialog, expand **Locations**.
2. Next to **pdfLaTeX**, select **Browse** and choose the actual `pdflatex` executable (`pdflatex.exe` on Windows). Do not choose the directory containing the executable.
3. Choose **Save**, return to **Settings → Documents**, then **Refresh**. Choose **Check PDF** if you want to test a local rendering operation.
4. If the executable is found but a particular PDF fails to compile, inspect the TeX error. A missing package or a custom presentation file may still need attention even with a functioning compiler.

The **Locations** controls also let you choose where future tools and downloads are stored. Changing them does not relocate existing files. AAAAT does not replace an existing working TeX installation simply because it prefers MiKTeX or BasicTeX for guided setup.

## Custom PDF design and editable LaTeX files

Ordinary CV and cover-letter editing stays inside AAAAT. People familiar with LaTeX have two further options:

- **Make a reusable Blueprint:** copy the project's [default Blueprint](../src/main/latex/default-blueprint.tex), edit it in an external text editor, and place a named `.tex` file inside the `blueprints` folder of AAAAT's application configuration directory (Electron `userData`, not the career workspace). Reopen the CV editor and use **Document options → PDF style** to select it when more than one Blueprint is available. This affects presentation, not the stored CV facts. Read the shared [AAAAT LaTeX API](../src/main/latex/aaaat.sty) when authoring a compatible style.
- **Modify one exported document:** find a PDF under **Documents → Generated files**, choose **Export source project**, then edit the exported `.tex` source outside AAAAT. Current exported projects contain an entry file such as `cv.tex`, `cover-letter.tex` or `application-document.tex`, with `aaaat.sty` and retained outputs. Compile the applicable entry file using your own `pdflatex` installation. Editing the exported copy does not rewrite the retained PDF, working document or reusable Blueprint in AAAAT.

The full [PDF and Blueprint walkthrough](https://didacll.github.io/AAAAT/explore.html#pdf) gives the specific UI actions.

## Sources and advanced details

Downloads come from [llama.cpp](https://github.com/ggml-org/llama.cpp/releases/tag/b11429), [IBM Granite](https://huggingface.co/ibm-granite/granite-4.1-3b-GGUF), [MiKTeX](https://miktex.org/download) and [BasicTeX](https://www.tug.org/mactex/morepackages.html). llama.cpp uses the MIT license; Granite uses Apache 2.0. TeX distributions contain components under their own published licenses.

The Windows prerequisite comes from [Microsoft's Visual C++ redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). Setup pins version 14.50, matching the working Windows runtime used with the tested Granite model, and verifies the download digest. Microsoft's x64 package also supplies ARM64 binaries on ARM64 Windows.

AAAAT pins the CPU runtime and exact tested GGUF revision and verifies downloaded archives against their published hashes. The initial tool/download location is local application data, outside the career workspace; both folders are editable under **Locations**. The generated startup script defaults to `127.0.0.1:47842` and is fully editable for the user’s setup.

An independently installed compatible AI or TeX installation remains supported. AAAAT does not change your system PATH or overwrite your selected AI defaults. Building installers yourself is described in the [README](../README.md#build-from-source).
