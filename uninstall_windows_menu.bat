@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo ============================================
echo   Augur AI Debugger - Context Menu Uninstaller
echo ============================================
echo.
echo This script will remove the "Augur: Debug in Live Panel"
echo from your Windows right-click menu.
echo.

:: Ask for Administrative Privileges to write to Registry
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: --- Remove from File Context Menu (*) ---
echo Removing from File context menu...
reg delete "HKEY_CLASSES_ROOT\*\shell\AugurDebug" /f >nul

:: --- Remove from Folder Context Menu (Directory) ---
echo Removing from Folder context menu...
reg delete "HKEY_CLASSES_ROOT\Directory\shell\AugurDebug" /f >nul

echo.
echo ==========================================
echo   Success! Right-click menu removed.
echo ==========================================
echo.
pause