# Final Plugin Install Script (Specific Versions)
$pluginDir = "C:\mc-server\plugins"

# Confirmed Hangar API Download Links
$faweUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.8.5/platforms/PAPER/download"
$favsUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/3.1.1/platforms/PAPER/download"

# 1. Setup Security Protocol
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 2. Cleanup old jars
Write-Host "Cleaning up old WorldEdit/FAWE/FAVS jars..."
if (Test-Path $pluginDir) {
    Get-ChildItem $pluginDir -Filter "*WorldEdit*.jar" | Remove-Item -Force
    Get-ChildItem $pluginDir -Filter "*FastAsyncWorldEdit*.jar" | Remove-Item -Force
    Get-ChildItem $pluginDir -Filter "*VoxelSniper*.jar" | Remove-Item -Force
    Get-ChildItem $pluginDir -Filter "*FastAsyncVoxelSniper*.jar" | Remove-Item -Force
}

# 3. Download Function
function Download-Plugin {
    param ($Url, $OutputPath)
    Write-Host "Downloading to $OutputPath..."
    try {
        # Use curl because Invoke-WebRequest was flaky with Hangar's redirects
        $cmd = "curl.exe -L -f -o `"$OutputPath`" `"$Url`""
        Invoke-Expression $cmd
        
        if (Test-Path $OutputPath) {
            $item = Get-Item $OutputPath
            $size = $item.Length
            
            if ($size -gt 50000) {
                # Plugins should be > 50KB
                Write-Host "✓ Success: $($item.Name) ($([math]::round($size/1MB, 2)) MB)" -ForegroundColor Green
            }
            else {
                Write-Host "✗ Error: File too small ($size bytes). Download failed." -ForegroundColor Red
                Remove-Item $OutputPath
            }
        }
        else {
            Write-Host "✗ Error: File not created." -ForegroundColor Red
        }
    }
    catch {
        Write-Host "✗ Exception: $_" -ForegroundColor Red
    }
}

# 4. Execute
$fawePath = Join-Path $pluginDir "FastAsyncWorldEdit-2.8.5.jar"
Download-Plugin -Url $faweUrl -OutputPath $fawePath

$favsPath = Join-Path $pluginDir "FastAsyncVoxelSniper-3.1.1.jar"
Download-Plugin -Url $favsUrl -OutputPath $favsPath
