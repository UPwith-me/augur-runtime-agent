@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

:: Get the directory of this script (Project Root)
SET "PROJECT_DIR=%~dp0"
:: Remove trailing backslash
SET "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo ==========================================
echo   Augur AI Debugger - Context Menu Setup (v2)
echo ==========================================
echo.
echo This script will add "Augur: Debug in Live Panel" to your Windows right-click menu.
echo It will use 'cmd /k' to keep the launcher window open for logging.
echo.
echo Project Location: %PROJECT_DIR%
echo Launcher Script:  %PROJECT_DIR%\launcher.js
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js first.
    pause
    exit /b
)

:: Ask for Administrative Privileges to write to Registry
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: --- (THE FIX) Use "cmd /k" instead of "cmd /c" ---
:: cmd /c = Run command and Close
:: cmd /k = Run command and Keep open (allows async operations and logging)
SET "LAUNCH_COMMAND=cmd /k node \"%PROJECT_DIR%\launcher.js\" \"%%1\""


:: --- Add to File Context Menu (*) ---
echo Adding to File context menu...
reg add "HKEY_CLASSES_ROOT\*\shell\AugurDebug" /ve /d "Augur: Debug in Live Panel" /f >nul
reg add "HKEY_CLASSES_ROOT\*\shell\AugurDebug" /v "Icon" /d "cmd.exe" /f >nul
reg add "HKEY_CLASSES_ROOT\*\shell\AugurDebug\command" /ve /d "!LAUNCH_COMMAND!" /f >nul

:: --- Add to Folder Context Menu (Directory) ---
echo Adding to Folder context menu...
reg add "HKEY_CLASSES_ROOT\Directory\shell\AugurDebug" /ve /d "Augur: Debug in Live Panel" /f >nul
reg add "HKEY_CLASSES_ROOT\Directory\shell\AugurDebug" /v "Icon" /d "cmd.exe" /f >nul
reg add "HKEY_CLASSES_ROOT\Directory\shell\AugurDebug\command" /ve /d "!LAUNCH_COMMAND!" /f >nul

echo.
echo ==========================================
echo   Success! Right-click menu installed.
echo ==========================================
echo.
echo You can now right-click any file or folder and select "Augur: Debug in Live Panel".
echo.
pause