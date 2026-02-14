# auto_backup_monitor.ps1 - Monitors for changes and triggers backup
$path = "d:\Antigravity\Bus_Lookup"
$filter = "*.*"
$backupScript = Join-Path $path "scripts\backup.ps1"

# Create FileSystemWatcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $path
$watcher.Filter = $filter
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Debounce logic
$lastEventTime = [DateTime]::MinValue
$debounceTime = New-TimeSpan -Seconds 10

$action = {
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType

    # Filter for relevant files and avoid cycles
    if ($name -match '\.(js|html|css|csv)$' -and $name -notmatch 'backups\\') {
        $now = Get-Date
        if (($now - $global:lastEventTime) -gt $debounceTime) {
            $global:lastEventTime = $now
            Write-Host "Detected $changeType in $name. Triggering backup..." -ForegroundColor Yellow
            & $backupScript
        }
    }
}

# Register events
$handlers = @()
$handlers += Register-ObjectEvent $watcher "Changed" -Action $action
$handlers += Register-ObjectEvent $watcher "Created" -Action $action
$handlers += Register-ObjectEvent $watcher "Deleted" -Action $action

Write-Host "Monitoring $path for changes... (Press Ctrl+C to stop)" -ForegroundColor Cyan

# Keep script running
try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    # Cleanup
    Write-Host "Cleaning up watcher..." -ForegroundColor Gray
    $watcher.EnableRaisingEvents = $false
    $handlers | ForEach-Object { Unregister-Event -SourceIdentifier $_.Name }
    $watcher.Dispose()
}
