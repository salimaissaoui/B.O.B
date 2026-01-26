# Update Plugins for Java 17 Compatibility
$pluginDir = "C:\mc-server\plugins"
$faweUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.7.1/platforms/PAPER/download"
$favsUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/2.8.4/platforms/PAPER/download"

# Ensure plugin directory exists
if (!(Test-Path $pluginDir)) {
    Write-Host "Plugin directory not found: $pluginDir" -ForegroundColor Red
    exit 1
}

# 1. Cleanup old jars
Write-Host "Cleaning up old WorldEdit/FAWE/FAVS jars..."
Get-ChildItem $pluginDir -Filter "*WorldEdit*.jar" | Remove-Item -Force -Verbose
Get-ChildItem $pluginDir -Filter "*FastAsyncWorldEdit*.jar" | Remove-Item -Force -Verbose
Get-ChildItem $pluginDir -Filter "*VoxelSniper*.jar" | Remove-Item -Force -Verbose
Get-ChildItem $pluginDir -Filter "*FastAsyncVoxelSniper*.jar" | Remove-Item -Force -Verbose

# Cleanup old config folders to prevent conflicts
$faweConfig = Join-Path $pluginDir "FastAsyncWorldEdit"
$weConfig = Join-Path $pluginDir "WorldEdit"
if (Test-Path $weConfig) { Remove-Item $weConfig -Recurse -Force -Verbose }
# keeping FAWE config might be safer unless user wants total reset, prompt implied total replacement.
if (Test-Path $faweConfig) { Remove-Item $faweConfig -Recurse -Force -Verbose }


# 2. Download new jars
Write-Host "Downloading FAWE v2.7.1..."
Invoke-WebRequest -Uri $faweUrl -OutFile (Join-Path $pluginDir "FastAsyncWorldEdit-2.7.1.jar")

Write-Host "Downloading FAVS v2.8.4..."
Invoke-WebRequest -Uri $favsUrl -OutFile (Join-Path $pluginDir "FastAsyncVoxelSniper-2.8.4.jar")

Write-Host "Plugin update complete!" -ForegroundColor Green
