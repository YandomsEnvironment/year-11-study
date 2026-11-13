@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0study-app\Start Recall.ps1"
if errorlevel 1 pause
