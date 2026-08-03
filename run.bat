@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "BACKEND_DIR=%CD%\backend"
set "FRONTEND_DIR=%CD%\frontend"

if not exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
  echo No existe el entorno virtual del backend. Ejecute primero start.bat
  exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo No estan instaladas las dependencias del frontend. Ejecute primero start.bat
  exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

start /B "" cmd /c "cd /d ""%BACKEND_DIR%"" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" > "%~dp0logs\backend.log" 2>&1

powershell -NoProfile -Command "$url='http://127.0.0.1:8000/health'; for($i=0; $i -lt 60; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($r.StatusCode -eq 200) { exit 0 } } catch {} Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 (
  echo El backend no quedo listo a tiempo. Revisa "%~dp0logs\backend.log"
  exit /b 1
)

start /B "" cmd /c "cd /d ""%FRONTEND_DIR%"" && set BROWSER=none && npm run dev -- --host 0.0.0.0 --port 5173" > "%~dp0logs\frontend.log" 2>&1

echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo Logs: %~dp0logs\backend.log, %~dp0logs\frontend.log
