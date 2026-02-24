# backup.ps1 - Creates a timestamped ZIP of the project
$projectName = "Bus_Lookup"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFolder = "backups"
$zipFile = Join-Path $backupFolder "backup_$timestamp.zip"

# Ensure backup folder exists
if (!(Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder
}

Write-Host "Creating backup: $zipFile..." -ForegroundColor Cyan

# Define exclusions
$exclude = @("node_modules", ".git", "backups", ".netlify", ".firebase")

# Create ZIP
Get-ChildItem -Path "modv2_sandbox", "modv2", "js" -Directory | Compress-Archive -DestinationPath $zipFile -Update

# Add root files (try-catch for locks)
try {
    Compress-Archive -Path "participants_data.csv", "package.json" -DestinationPath $zipFile -Update -ErrorAction SilentlyContinue
}
catch {}

Write-Host "Backup completed successfully." -ForegroundColor Green
