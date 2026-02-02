$ErrorActionPreference = "Stop"

$apiKey = "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I"
$projectId = "buslookup-5fd0d"
$appId = "default-app-id"
$userName = "홍길동"
$newPhone = "01012345678"

Write-Host "Starting update script..."

# 1. Authenticate
$authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey"
$authBody = @{ returnSecureToken = $true } | ConvertTo-Json
$authResponse = Invoke-RestMethod -Uri $authUrl -Method Post -Body $authBody -ContentType "application/json"
$idToken = $authResponse.idToken
Write-Host "Authenticated."

# 2. List Documents (Simpler than Query)
# Collection Path: projects/$projectId/databases/(default)/documents/artifacts/$appId/public/data/participants
$collectionPath = "projects/$projectId/databases/(default)/documents/artifacts/$appId/public/data/participants"
$listUrl = "https://firestore.googleapis.com/v1/$collectionPath"

try {
    $listResponse = Invoke-RestMethod -Uri $listUrl -Method Get -Headers @{ Authorization = "Bearer $idToken" }

    if ($listResponse.documents) {
        foreach ($doc in $listResponse.documents) {
            # Check if Name matches
            $fields = $doc.fields
            if ($fields.name.stringValue -eq $userName -or $fields.이름.stringValue -eq $userName) {
                $docName = $doc.name
                Write-Host "Found User: $userName at $docName"

                # 3. Update Phone
                $targetUrl = "https://firestore.googleapis.com/v1/$docName" + "?updateMask.fieldPaths=phone"
                $patchBody = @{
                    fields = @{
                        phone = @{ stringValue = $newPhone }
                    }
                } | ConvertTo-Json -Depth 5

                $patchResponse = Invoke-RestMethod -Uri $targetUrl -Method Patch -Body $patchBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $idToken" }
                Write-Host "SUCCESS: Updated phone number to $newPhone"
            }
        }
    }
    else {
        Write-Host "No documents found in collection."
    }
}
catch {
    Write-Host "Error listing documents: $_"
    # Print more detail if available
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Response Body: $respBody"
    }
}
