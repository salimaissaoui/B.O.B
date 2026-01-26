@echo off
set "PLUGIN_DIR=C:\mc-server\plugins"
set "FAWE_URL=https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.8.5/platforms/PAPER/download"
set "FAVS_URL=https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/3.1.1/platforms/PAPER/download"

echo Cleaning old plugins...
del /Q "%PLUGIN_DIR%\*FastAsync*.jar" 2>nul
del /Q "%PLUGIN_DIR%\*WorldEdit*.jar" 2>nul
del /Q "%PLUGIN_DIR%\*VoxelSniper*.jar" 2>nul

echo Downloading FAWE 2.8.5...
curl.exe -L -f -o "%PLUGIN_DIR%\FastAsyncWorldEdit-2.8.5.jar" "%FAWE_URL%"

echo Downloading FAVS 3.1.1...
curl.exe -L -f -o "%PLUGIN_DIR%\FastAsyncVoxelSniper-3.1.1.jar" "%FAVS_URL%"

echo Done.
dir "%PLUGIN_DIR%"
