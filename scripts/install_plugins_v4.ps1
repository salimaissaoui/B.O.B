# Update Plugins using Curl (V4 - Syntax Fixed)
$pluginDir = "C:\mc-server\plugins"
$faweUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncWorldEdit/versions/2.8.5/platforms/PAPER/download"
$favsUrl = "https://hangar.papermc.io/api/v1/projects/IntellectualSites/FastAsyncVoxelSniper/versions/3.1.1/platforms/PAPER/download"

Write-Host "Starting Curl Download..."

# Function to check and download
function Curl-Download {
    param ($Url, $OutputPath)
    Write-Host "Downloading to $OutputPath via curl..."
    
    # Use Start-Process to avoid PowerShell quoting hell
    $args = @("-L", "-f", "-o", $OutputPath, $Url)
    $process = Start-Process -FilePath "curl.exe" -ArgumentList $args -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        if (Test-Path $OutputPath) {
            $item = Get-Item $OutputPath
            $size = $item.Length
            if ($size -gt 50000) {
                Write-Host "✓ Success: $($item.Name) ($([math]::round($size/1MB, 2)) MB)" -ForegroundColor Green
            }
            else {
                Write-Host "✗ Error: File too small ($size bytes)." -ForegroundColor Red
            }
        }
        else {
            Write-Host "✗ Error: File not found after curl." -ForegroundColor Red
        }
    }
    else {
        Write-Host "✗ Error: Curl exited with code $($process.ExitCode)" -ForegroundColor Red
    }
}

# Cleanup existing
if (Test-Path $pluginDir) {
    Get-ChildItem $pluginDir -Filter "*FastAsync*.jar" | Remove-Item -Force -ErrorAction SilentlyContinue
}

# Download
$fawePath = Join-Path $pluginDir "FastAsyncWorldEdit-2.8.5.jar"
Curl-Download -Url $faweUrl -OutputPath $fawePath

$favsPath = Join-Path $pluginDir "FastAsyncVoxelSniper-3.1.1.jar"
Curl-Download -Url $favsUrl -OutputPath $favsPath

Write-Host "Done."
Get-ChildItem $pluginDir
