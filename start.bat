@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org first.
  pause
  exit /b 1
)
if not exist node_modules\next\package.json (
  call npm install
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and Node.js version.
    pause
    exit /b 1
  )
)
call npm run prepare:assets
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://localhost:3000 in Chrome or Edge once the server is ready.
call npm run dev
pause
