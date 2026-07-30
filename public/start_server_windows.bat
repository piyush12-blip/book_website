@echo off
cd /d "%~dp0"
echo Starting Bibliotheque on http://localhost:8000
python -m http.server 8000
if errorlevel 1 py -m http.server 8000
pause
