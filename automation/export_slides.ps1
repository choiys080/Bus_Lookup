$pptxPath = "d:\Antigravity\Bus_Lookup\ref\비브라운코리아_액티비티 앱0130.pptx"
$outputDir = "d:\Antigravity\Bus_Lookup\ref\slides"

if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir
}

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $presentation = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)

    $slideCount = $presentation.Slides.Count
    Write-Host "Exporting $slideCount slides to $outputDir..."

    for ($i = 1; $i -le $slideCount; $i++) {
        $slide = $presentation.Slides.Item($i)
        $imagePath = Join-Path $outputDir "slide_$($i).png"
        $slide.Export($imagePath, "PNG")
        Write-Host "Exported slide $i to $imagePath"
    }

    $presentation.Close()
    $ppt.Quit()
}
catch {
    Write-Error "Failed to export slides: $_"
}
finally {
    # Release COM objects
    if ($slide) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($slide) | Out-Null }
    if ($presentation) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null }
    if ($ppt) { [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
