$ErrorActionPreference = "Stop"

$apiKey = "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I"
$projectId = "buslookup-5fd0d"
$userName = "홍길동"
$newPhone = "01012345678"

# 1. Authenticate (Anonymous)
$authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey"
$authBody = @{ returnSecureToken = $true } | ConvertTo-Json
$authResponse = Invoke-RestMethod -Uri $authUrl -Method Post -Body $authBody -ContentType "application/json"
$idToken = $authResponse.idToken

Write-Host "Authenticated."

# 2. Query for the Document
$queryUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents:runQuery"
$queryBody = @{
    structuredQuery = @{
        from  = @(@{ collectionId = "participants"; allDescendants = $true })
        where = @{
            fieldFilter = @{
                field = @{ fieldPath = "name" }
                op    = "EQUAL"
                value = @{ stringValue = $userName }
            }
        }
    }
} | ConvertTo-Json -Depth 10

$queryResponse = Invoke-RestMethod -Uri $queryUrl -Method Post -Body $queryBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $idToken" }

# 3. Process Results and Update
if ($queryResponse -and $queryResponse.document) {
    foreach ($item in $queryResponse) {
        if ($item.document) {
            $docPath = $item.document.name # Full resource name
            Write-Host "Found document: $docPath"

            # Extract the correct REST URL for patching
            $targetUrl = "https://firestore.googleapis.com/v1/$docPath" + "?updateMask.fieldPaths=phone"

            $patchBody = @{
                fields = @{
                    phone = @{ stringValue = $newPhone }
                }
            } | ConvertTo-Json -Depth 5

            $patchResponse = Invoke-RestMethod -Uri $targetUrl -Method Patch -Body $patchBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $idToken" }

            Write-Host "Successfully updated phone to $newPhone for $docPath"
        }
    }
}
else {
    Write-Host "No document found for user: $userName"
}
