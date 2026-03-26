@echo off
REM AngelQuant - Windows DB Setup
REM Double-click or run: setup_db.bat

echo.
echo  AngelQuant Database Setup
echo  ==========================
echo  Creates: angelquant_db, user aquser, all tables
echo  Enter your MySQL ROOT password when prompted.
echo.

mysql -u root -p < scripts\setup_db.sql

IF %ERRORLEVEL% EQU 0 (
  echo.
  echo  SUCCESS! Now run:
  echo    npm install
  echo    npm run seed
  echo    npm run server
  echo  Then open: http://localhost:3000
  echo.
) ELSE (
  echo.
  echo  ERROR - Is MySQL running?
  echo  Try: net start MySQL80
  echo  Or add MySQL to PATH:
  echo    C:\Program Files\MySQL\MySQL Server 8.0\bin
  echo.
)
pause
