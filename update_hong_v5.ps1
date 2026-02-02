$ErrorActionPreference = "Stop"
$k = "AIzaSyAnp90bFTz6_E7r0tBPAYKu58GbwQqto0I"
$p = "buslookup-5fd0d"
$a = "default-app-id"
$u = "홍길동"
$new = "01012345678"

$r1 = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$k" -Method Post -Body (@{returnSecureToken = $true } | ConvertTo-Json) -ContentType "application/json"
$t = $r1.idToken
"Auth OK"

$url = "https://firestore.googleapis.com/v1/projects/$p/databases/(default)/documents/artifacts/$a/public/data/participants"
$r2 = Invoke-RestMethod -Uri $url -Method Get -Headers @{Authorization = "Bearer $t" }

if ($r2.documents) {
    foreach ($d in $r2.documents) {
        if ($d.fields.name.stringValue -eq $u) {
            $dn = $d.name
            "Found $dn"
            $patch = "https://firestore.googleapis.com/v1/$dn" + "?updateMask.fieldPaths=phone"
            $body = @{fields = @{phone = @{stringValue = $new } } } | ConvertTo-Json -Depth 5
            $r3 = Invoke-RestMethod -Uri $patch -Method Patch -Body $body -ContentType "application/json" -Headers @{Authorization = "Bearer $t" }
            "UPDATED OK"
        }
    }
}
