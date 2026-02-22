$outFile = "d:\Antigravity\Bus_Lookup\modv2\AI_CONTEXT.md"
$header = "# Project Context: Bus Lookup ModV2`n`nGenerated on $(Get-Date)`n`n"
Set-Content -Path $outFile -Value $header -Encoding UTF8

$root = "d:\Antigravity\Bus_Lookup"

try {
    Add-Content -Path $outFile -Value "`r`n## File: FULL_PROJECT_MAP.md"
    Add-Content -Path $outFile -Value "``````markdown"
    Get-Content -Path "$root\FULL_PROJECT_MAP.md" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: index.html"
    Add-Content -Path $outFile -Value "``````html"
    Get-Content -Path "$root\modv2\index.html" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: styles.css"
    Add-Content -Path $outFile -Value "``````css"
    Get-Content -Path "$root\modv2\styles.css" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: app.js"
    Add-Content -Path $outFile -Value "``````javascript"
    Get-Content -Path "$root\modv2\app.js" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: js/config.js"
    Add-Content -Path $outFile -Value "``````javascript"
    Get-Content -Path "$root\modv2\js\config.js" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: js/services.js"
    Add-Content -Path $outFile -Value "``````javascript"
    Get-Content -Path "$root\modv2\js\services.js" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: js/ui.js"
    Add-Content -Path $outFile -Value "``````javascript"
    Get-Content -Path "$root\modv2\js\ui.js" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"

    Add-Content -Path $outFile -Value "`r`n## File: js/utils.js"
    Add-Content -Path $outFile -Value "``````javascript"
    Get-Content -Path "$root\modv2\js\utils.js" -Raw | Add-Content -Path $outFile
    Add-Content -Path $outFile -Value "``````"
}
catch {
    Write-Host "Error: $_"
}

Write-Host "Done."
