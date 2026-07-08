@echo off
setlocal
cd /d "%~dp0\.."

if defined PYTHON (
  "%PYTHON%" -m aaaat.cli launch %*
) else (
  python -m aaaat.cli launch %*
)
