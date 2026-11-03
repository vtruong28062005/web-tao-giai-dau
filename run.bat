@echo off
title TournaPro - Tournament App
echo ========================================================
echo   TournaPro - He Thong Quan Ly & Tao Giai Dau Chuyen Nghiep
echo ========================================================
echo.
echo Dang dong cac tien trinh cu neu co...
taskkill /F /IM TournamentApp.exe 2>nul
echo.
echo Dang khoi dong may chu tai http://localhost:5000 ...
start http://localhost:5000
dotnet run
pause
