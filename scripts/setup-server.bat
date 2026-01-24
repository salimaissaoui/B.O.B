@echo off
echo ========================================
echo Minecraft Server Setup Script
echo ========================================
echo.

set SERVER_DIR=%~dp0..\minecraft-server
set SERVER_JAR=minecraft_server.1.20.1.jar

echo Creating server directory: %SERVER_DIR%
if not exist "%SERVER_DIR%" mkdir "%SERVER_DIR%"

echo.
echo ========================================
echo STEP 1: Download Server JAR
echo ========================================
echo.
echo Please download the Minecraft server JAR manually:
echo 1. Go to: https://www.minecraft.net/en-us/download/server
echo 2. Download minecraft_server.1.20.1.jar
echo 3. Save it to: %SERVER_DIR%\%SERVER_JAR%
echo.
pause

if not exist "%SERVER_DIR%\%SERVER_JAR%" (
    echo ERROR: Server JAR not found at %SERVER_DIR%\%SERVER_JAR%
    echo Please download it and run this script again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 2: Create Start Script
echo ========================================
echo.

(
echo @echo off
echo cd /d "%~dp0"
echo java -Xmx1024M -Xms1024M -jar %SERVER_JAR% nogui
echo pause
) > "%SERVER_DIR%\start-server.bat"

echo Created start-server.bat
echo.

echo ========================================
echo STEP 3: First Run (to generate files)
echo ========================================
echo.
echo Starting server for the first time...
echo This will create eula.txt - we'll need to accept it.
echo.

cd /d "%SERVER_DIR%"
start /wait cmd /c "java -Xmx1024M -Xms1024M -jar %SERVER_JAR% nogui"

echo.
echo ========================================
echo STEP 4: Accept EULA
echo ========================================
echo.

if exist "%SERVER_DIR%\eula.txt" (
    echo Modifying eula.txt...
    powershell -Command "(Get-Content '%SERVER_DIR%\eula.txt') -replace 'eula=false', 'eula=true' | Set-Content '%SERVER_DIR%\eula.txt'"
    echo EULA accepted!
) else (
    echo WARNING: eula.txt not found. You may need to run the server once manually.
)

echo.
echo ========================================
echo STEP 5: Configure Server
echo ========================================
echo.

if exist "%SERVER_DIR%\server.properties" (
    echo Configuring server.properties for bot testing...
    powershell -Command "(Get-Content '%SERVER_DIR%\server.properties') -replace 'online-mode=true', 'online-mode=false' | Set-Content '%SERVER_DIR%\server.properties'"
    echo Set online-mode=false for offline testing
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start your server:
echo   1. Navigate to: %SERVER_DIR%
echo   2. Run: start-server.bat
echo.
echo To connect your bot, update .env:
echo   MINECRAFT_HOST=localhost
echo   MINECRAFT_PORT=25565
echo.
pause
