# Update Plugins for Java 17 Compatibility (V2.1 - Simplified)
$pluginDir = "C:\mc-server\plugins"
$faweUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.7.1/platforms/PAPER/download"
$favsUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/2.8.4/platforms/PAPER/download"

# 1. Setup Security Protocol
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 2. Cleanup old jars
Write-Host "Cleaning up old WorldEdit/FAWE/FAVS jars..."
if (Test-Path $pluginDir) {
    Get-ChildItem $pluginDir -Filter "*WorldEdit*.jar" | Remove-Item -Force -Verbose
    Get-ChildItem $pluginDir -Filter "*FastAsyncWorldEdit*.jar" | Remove-Item -Force -Verbose
    Get-ChildItem $pluginDir -Filter "*VoxelSniper*.jar" | Remove-Item -Force -Verbose
    Get-ChildItem $pluginDir -Filter "*FastAsyncVoxelSniper*.jar" | Remove-Item -Force -Verbose
}
else {
    Write-Host "Plugins directory does not exist!" -ForegroundColor Red
    exit 1
}

# 3. Download Function
function Download-Plugin {
    param ($Url, $OutputPath)
    Write-Host "Downloading to $OutputPath..."
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UserAgent "Mozilla/5.0" -TimeoutSec 30
        
        if (Test-Path $OutputPath) {
            $item = Get-Item $OutputPath
            $size = $item.Length
            
            if ($size -gt 1000) {
                Write-Host "Success: $($item.Name) ($size bytes)" -ForegroundColor Green
            }
            else {
                Write-Host "Error: File is empty or too small ($size bytes). Download likely failed." -ForegroundColor Red
                Remove-Item $OutputPath
            }
        }
        else {
            Write-Host "Error: File not created at $OutputPath" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Download Exception: $_" -ForegroundColor Red
    }
}

# 4. Execute Downloads
$fawePath = Join-Path $pluginDir "FastAsyncWorldEdit-2.7.1.jar"
Download-Plugin -Url $faweUrl -OutputPath $fawePath

$favsPath = Join-Path $pluginDir "FastAsyncVoxelSniper-2.8.4.jar"
Download-Plugin -Url $favsUrl -OutputPath $favsPath

# 5. List Result
Write-Host "`nCurrent Plugins:"
Get-ChildItem $pluginDir
