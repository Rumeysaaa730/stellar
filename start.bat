@echo off
echo.
echo ========================================
echo  FreelanceChain - Baslatiliyor
echo  Stellar Blockchain Freelance Platformu
echo ========================================
echo.

echo [1/2] Backend port 3002'de baslatiliyor...
start "FreelanceChain Backend (port 3002)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 4 /nobreak > nul
echo.

echo [2/2] Frontend port 5173'te baslatiliyor...
start "FreelanceChain Frontend (port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak > nul
echo.

echo ========================================
echo  Uygulama hazir!
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3002/api/health
echo.
echo  Demo Hesaplar:
echo  Musteri:    musteri@demo.com    / demo123
echo  Freelancer: freelancer@demo.com / demo123
echo  Admin:      admin@escrow.com    / admin123
echo.
echo  Freighter kurulum: https://www.freighter.app/
echo ========================================
echo.
timeout /t 5 /nobreak > nul
start http://localhost:5173
