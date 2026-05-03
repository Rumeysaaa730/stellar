@echo off
echo.
echo ========================================
echo  FreelanceChain - Kurulum Basliyor
echo  Stellar Blockchain Freelance Platformu
echo ========================================
echo.

echo [1/4] Backend bagımlılıkları kuruluyor...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo HATA: Backend kurulumu basarisiz!
    pause
    exit /b 1
)
echo Backend kurulumu tamamlandi.
echo.

echo [2/4] Frontend bagımlılıkları kuruluyor...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo HATA: Frontend kurulumu basarisiz!
    pause
    exit /b 1
)
echo Frontend kurulumu tamamlandi.
echo.

echo [3/4] Proje dizinine donuluyor...
cd ..

echo [4/4] Kurulum tamamlandi!
echo.
echo ========================================
echo  Uygulamayi baslatmak icin:
echo  start.bat dosyasini calistirin
echo
echo  veya ayri terminallerde:
echo  Backend: cd backend && npm run dev
echo  Frontend: cd frontend && npm run dev
echo ========================================
echo.
pause
