@echo off
cd /d "%~dp0"

REM If node_modules does not exist, run npm install
if not exist "node_modules\electron" (
    echo First time setup: Installing dependencies...
    call npm install
)

REM If dist does not exist, run npm run build
if not exist "dist\index.html" (
    echo Building DeskGrid...
    call npm run build
)

REM Create Desktop shortcut with custom icon if not already created
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desk = [Environment]::GetFolderPath('Desktop'); " ^
    "$lnk = Join-Path $desk 'DeskGrid.lnk'; " ^
    "if (-not (Test-Path $lnk)) { " ^
    "  $s = $ws.CreateShortcut($lnk); " ^
    "  $s.TargetPath = (Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'); " ^
    "  $s.Arguments = '.'; " ^
    "  $s.WorkingDirectory = $PSScriptRoot; " ^
    "  $s.IconLocation = (Join-Path $PSScriptRoot 'assets\deskgrid.ico') + ',0'; " ^
    "  $s.Description = 'DeskGrid Windows Desktop Manager'; " ^
    "  $s.Save(); " ^
    "}"

start "" "%~dp0node_modules\electron\dist\electron.exe" .
