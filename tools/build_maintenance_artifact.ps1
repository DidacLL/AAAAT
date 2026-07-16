[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\dist\maintenance")
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null

# This explicit support artifact intentionally retains the raw maintenance
# command surface.  It is separate from the normal installer and portable app.
Copy-Item -LiteralPath (Join-Path $repo "pyproject.toml") -Destination (Join-Path $output "pyproject.toml") -Force
Copy-Item -LiteralPath (Join-Path $repo "README.md") -Destination (Join-Path $output "README.md") -Force
Copy-Item -LiteralPath (Join-Path $repo "LICENSE") -Destination (Join-Path $output "LICENSE") -Force
Copy-Item -LiteralPath (Join-Path $repo "aaaat") -Destination (Join-Path $output "aaaat") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $repo "docs\maintenance.md") -Destination (Join-Path $output "README-MAINTENANCE.md") -Force

@'
AAAAT maintenance support artifact

This folder is for support, recovery, backup, restore, and development only.
It is not the normal desktop distribution and must not be configured as an AI tool.

Create a trusted support virtual environment, install this folder with the desktop extra,
then run the explicit Python module command documented in README-MAINTENANCE.md.
'@ | Set-Content -LiteralPath (Join-Path $output "README.txt") -Encoding utf8

Write-Host "Built maintenance support artifact at $output"
