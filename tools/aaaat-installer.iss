; Compile through tools/build_windows_release.ps1.  This file deliberately
; packages only the frozen desktop app and the paired host bridge.
#ifndef SourceDir
  #error SourceDir must be supplied by the release build.
#endif
#ifndef OutputDir
  #error OutputDir must be supplied by the release build.
#endif

[Setup]
AppName=AAAAT
AppVersion=1.0.0
DefaultDirName={autopf}\AAAAT
DefaultGroupName=AAAAT
OutputDir={#OutputDir}
OutputBaseFilename=AAAAT-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=AAAAT

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{autoprograms}\AAAAT"; Filename: "{app}\AAAAT.exe"
Name: "{autodesktop}\AAAAT"; Filename: "{app}\AAAAT.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Run]
Filename: "{app}\AAAAT.exe"; Description: "Open AAAAT"; Flags: nowait postinstall skipifsilent
