[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\dist\windows"),
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
$buildRoot = Join-Path $env:TEMP "aaaat-release-build"
$venv = Join-Path $buildRoot "venv"
$python = Join-Path $venv "Scripts\python.exe"

Remove-Item -LiteralPath $buildRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $buildRoot, $output -Force | Out-Null

& py -3 -m venv $venv
& $python -m pip install --upgrade pip
& $python -m pip install "$repo[desktop]" pyinstaller

$portable = Join-Path $output "AAAAT-portable"
$desktopDist = Join-Path $buildRoot "desktop"
$bridgeDist = Join-Path $buildRoot "bridge"
$common = @("--noconfirm", "--clean", "--onedir", "--contents-directory", "runtime", "--collect-all", "wx")
$excluded = @(
    "aaaat.cli", "aaaat.mcp_runtime", "aaaat.mcp_smoke", "aaaat.host_bridge_smoke",
    "aaaat.demo_seed", "aaaat.advanced_command_fixture", "aaaat.release_validation",
    "aaaat.release_validation_cli", "aaaat.runtime_conformance"
)
$excludeArgs = foreach ($module in $excluded) { @("--exclude-module", $module) }

& $python -m PyInstaller @common @excludeArgs "--windowed" "--name" "AAAAT" "--distpath" $desktopDist "--workpath" (Join-Path $buildRoot "work-desktop") "--specpath" $buildRoot (Join-Path $repo "scripts\desktop_entry.py")
& $python -m PyInstaller @common @excludeArgs "--console" "--name" "aaaat-host-bridge" "--distpath" $bridgeDist "--workpath" (Join-Path $buildRoot "work-bridge") "--specpath" $buildRoot (Join-Path $repo "scripts\host_bridge_entry.py")

Remove-Item -LiteralPath $portable -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $portable, (Join-Path $portable "bridge") -Force | Out-Null
Copy-Item -Path (Join-Path $desktopDist "AAAAT\*") -Destination $portable -Recurse -Force
Copy-Item -Path (Join-Path $bridgeDist "aaaat-host-bridge\*") -Destination (Join-Path $portable "bridge") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $repo "docs\user-guide.md") -Destination (Join-Path $portable "AAAAT User Guide.md") -Force

$archive = Join-Path $output "AAAAT-portable.zip"
Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
Compress-Archive -LiteralPath $portable -DestinationPath $archive -Force

if (-not $SkipInstaller) {
    $iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    if ($null -eq $iscc) {
        throw "Inno Setup is required for the installer. Install it or rerun with -SkipInstaller to build the portable bundle only."
    }
    & $iscc.Source "/DSourceDir=$portable" "/DOutputDir=$output" (Join-Path $repo "tools\aaaat-installer.iss")
}

Write-Host "Built $archive"
