@echo off
set PATH=%USERPROFILE%\.local\nodejs;%PATH%
cd /d "%~dp0"
echo Starting CareerPulse AI (Frontend on http://localhost:5173 + Local Email Relay on http://localhost:3001)...
npm.cmd run dev
pause
