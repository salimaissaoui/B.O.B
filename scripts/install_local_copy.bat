@echo off
set "FAWE_URL=https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.8.5/platforms/PAPER/download"
set "FAVS_URL=https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/3.1.1/platforms/PAPER/download"

echo Downloading to LOCAL folder...
curl.exe -L -f -o "FastAsyncWorldEdit-2.8.5.jar" "%FAWE_URL%"
if %ERRORLEVEL% NEQ 0 echo FAWE Download Failed & exit /b 1

curl.exe -L -f -o "FastAsyncVoxelSniper-3.1.1.jar" "%FAVS_URL%"
if %ERRORLEVEL% NEQ 0 echo FAVS Download Failed & exit /b 1

echo.
echo Files downloaded locally. Attempting copy to server...
copy /Y "FastAsyncWorldEdit-2.8.5.jar" "C:\mc-server\plugins\"
copy /Y "FastAsyncVoxelSniper-3.1.1.jar" "C:\mc-server\plugins\"

if exist "C:\mc-server\plugins\FastAsyncWorldEdit-2.8.5.jar" (
    echo SUCCESS: FAWE installed.
) else (
    echo FAIL: FAWE copy failed.
)

if exist "C:\mc-server\plugins\FastAsyncVoxelSniper-3.1.1.jar" (
    echo SUCCESS: FAVS installed.
) else (
    echo FAIL: FAVS copy failed.
)
