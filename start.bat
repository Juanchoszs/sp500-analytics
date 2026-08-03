@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "BACKEND_DIR=%CD%\backend"
set "FRONTEND_DIR=%CD%\frontend"

if not exist "%BACKEND_DIR%\.env" (
  if exist "%BACKEND_DIR%\.env.example" (
    copy /y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
  )
)

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 (
  for %%I in (3.13 3.12 3.11 3.10) do (
    py -%%I --version >nul 2>nul
    if not errorlevel 1 (
      set "PYTHON_CMD=py -%%I"
      goto :python_found
    )
  )
)

where python >nul 2>nul
if not errorlevel 1 (
  python --version >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CMD=python"
  )
)

:python_found
if not defined PYTHON_CMD (
  echo No se encontro una version compatible de Python 3.10-3.13.
  echo Instala Python 3.13 o 3.12 y vuelve a ejecutar este bat.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js no encontrado.
  exit /b 1
)

if not exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
  %PYTHON_CMD% -m venv "%BACKEND_DIR%\venv"
)

set "PYTHON_VENV=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_VENV%" -m pip install --upgrade pip setuptools wheel
"%PYTHON_VENV%" -m pip install -r "%BACKEND_DIR%\requirements.txt" --only-binary=:all:
if errorlevel 1 (
  "%PYTHON_VENV%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
)

cd /d "%FRONTEND_DIR%"
npm install --no-audit --no-fund

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
