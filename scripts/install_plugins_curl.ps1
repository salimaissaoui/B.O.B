# Update Plugins using Curl (V3 - Robust)
$pluginDir = "C:\mc-server\plugins"
$faweUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.7.1/platforms/PAPER/download"
$favsUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/2.8.4/platforms/PAPER/download"

Write-Host "Starting Curl Download..."

# Function to check and download
function Curl-Download {
    param ($Url, $OutputPath)
    Write-Host "Downloading to $OutputPath via curl..."
    
    # Use curl.exe explicitly (cmd syntax wrapper)
    # -L follows redirects, -o output file, -f fail silently on server errors (to detect them)
    $cmd = "curl.exe -L -f -o `"$OutputPath`" `"$Url`""
    Invoke-Expression $cmd
    
    if (Test-Path $OutputPath) {
        $item = Get-Item $OutputPath
        $size = $item.Length
        if ($size -gt 1000) {
            Write-Host "Success: $($item.Name) ($size bytes)" -ForegroundColor Green
        }
        else {
            Write-Host "Error: File too small ($size bytes)." -ForegroundColor Red
        }
    }
    else {
        Write-Host "Error: File not found after curl." -ForegroundColor Red
    }
}

# Cleanup existing (if any failed attempts left junk)
if (Test-Path $pluginDir) {
    Get-ChildItem $pluginDir -Filter "*FastAsync*.jar" | Remove-Item -Force
}

# Download
$fawePath = Join-Path $pluginDir "FastAsyncWorldEdit-2.7.1.jar"
Curl-Download -Url $faweUrl -OutputPath $fawePath

$favsPath = Join-Path $pluginDir "FastAsyncVoxelSniper-2.8.4.jar"
Curl-Download -Url $favsUrl -OutputPath $favsPath

Write-Host "Done."
Get-ChildItem $pluginDir
