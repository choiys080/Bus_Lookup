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
Compress-Archive -Path "modv2", "participants_data.csv", "package.json", "styles.css", "update_hong.js" -DestinationPath $zipFile -Force

Write-Host "Backup completed successfully." -ForegroundColor Green
