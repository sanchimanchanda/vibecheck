@echo off
echo Starting VibeCheck Services...
echo.

echo 🐍 Starting Python Flask Scanner Service...
start "Flask Scanner Service" cmd /k "python scanner_service.py"

echo ⏳ Waiting for Flask service to start...
timeout /t 3 /nobreak > nul

echo 🌐 Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo ✅ Both services are starting!
echo.
echo 📡 Flask Scanner Service: http://127.0.0.1:5000
echo 🌐 Next.js Frontend: http://localhost:3000
echo.
echo Press any key to continue...
pause > nul