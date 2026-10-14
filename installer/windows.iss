[Setup]
AppId={{501FB4F7-EE9B-4398-9AE9-271014DE41A9}
AppName=AAAAT
AppVersion={#AppVersion}
AppPublisher=AAAAT
AppPublisherURL=https://github.com/DidacLL/AAAAT
DefaultDirName={localappdata}\Programs\AAAAT
DefaultGroupName=AAAAT
PrivilegesRequired=lowest
#if AppArch == "arm64"
ArchitecturesAllowed=arm64
ArchitecturesInstallIn64BitMode=arm64
#else
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
#endif
MinVersion=10.0
OutputDir={#InstallerOutput}
OutputBaseFilename=AAAAT-windows-{#AppArch}-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\aaaat.exe
CloseApplications=yes

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Icons]
Name: "{group}\AAAAT"; Filename: "{app}\aaaat.exe"
Name: "{userdesktop}\AAAAT"; Filename: "{app}\aaaat.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\aaaat.exe"; Description: "Open AAAAT"; Flags: nowait postinstall skipifsilent
