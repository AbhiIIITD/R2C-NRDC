$ErrorActionPreference = "Stop"
$base = "http://localhost:4001/api/v1"
$pass = 0; $fail = 0
function Check($name, $cond, $detail="") {
  if ($cond) { Write-Host "  [PASS] $name $detail" -ForegroundColor Green; $script:pass++ }
  else { Write-Host "  [FAIL] $name $detail" -ForegroundColor Red; $script:fail++ }
}
function Login($email, $pwd) {
  $body = @{ email=$email; password=$pwd } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType "application/json" -SessionVariable s
  return @{ token = $r.data.accessToken; user = $r.data.user; session = $s }
}
function Hdr($ctx) { return @{ Authorization = "Bearer $($ctx.token)" } }
function Get-Api($ctx, $path) {
  return Invoke-RestMethod -Uri "$base$path" -Headers (Hdr $ctx) -WebSession $ctx.session
}

Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
$h = Invoke-RestMethod -Uri "$base/health"
Check "health endpoint" ($h.data.status -eq "ok")

Write-Host "`n=== AUTH (3 roles) ===" -ForegroundColor Cyan
$researcher = Login "dr.smith@university.edu" "password"
Check "researcher login" ($researcher.token -ne $null) "($($researcher.user.role))"
$admin = Login "admin@nrdc.org" "password"
Check "admin login" ($admin.token -ne $null) "($($admin.user.role))"
$industry = Login "mark.wilson@pharmatech.com" "password"
Check "industry login" ($industry.token -ne $null) "($($industry.user.role))"

Write-Host "`n=== Bad credentials rejected ===" -ForegroundColor Cyan
try { Login "admin@nrdc.org" "wrongpass" | Out-Null; Check "reject bad password" $false }
catch { Check "reject bad password" ($_.Exception.Response.StatusCode.value__ -eq 401) "(401)" }

Write-Host "`n=== /auth/me ===" -ForegroundColor Cyan
Check "researcher me" ((Get-Api $researcher "/auth/me").data.email -eq "dr.smith@university.edu")
Check "admin me" ((Get-Api $admin "/auth/me").data.email -eq "admin@nrdc.org")
Check "industry me" ((Get-Api $industry "/auth/me").data.email -eq "mark.wilson@pharmatech.com")

Write-Host "`n=== Unauthenticated blocked ===" -ForegroundColor Cyan
try { Invoke-RestMethod -Uri "$base/studies" | Out-Null; Check "block no-token /studies" $false }
catch { Check "block no-token /studies" ($_.Exception.Response.StatusCode.value__ -eq 401) "(401)" }

Write-Host "`n=== RESEARCHER data ===" -ForegroundColor Cyan
$rStudies = Get-Api $researcher "/studies"
Check "researcher /studies" ($rStudies.data.Count -ge 0) "($($rStudies.data.Count) studies)"
$rNotif = Get-Api $researcher "/notifications"
Check "researcher /notifications" ($rNotif.success -eq $true) "($($rNotif.data.Count))"

Write-Host "`n=== INDUSTRY marketplace ===" -ForegroundColor Cyan
$techs = Get-Api $industry "/marketplace/technologies"
Check "industry marketplace/technologies" ($techs.data.Count -ge 1) "($($techs.data.Count) published)"
$domains = Get-Api $industry "/marketplace/domains"
Check "industry marketplace/domains" ($domains.data.Count -ge 1) "($($domains.data -join ', '))"
Check "industry /interests" ((Get-Api $industry "/interests").success)
Check "industry /problem-statements" ((Get-Api $industry "/problem-statements").success)
Check "industry /meetings" ((Get-Api $industry "/meetings").success)
Check "industry /licenses" ((Get-Api $industry "/licenses").success)

Write-Host "`n=== ROLE ENFORCEMENT ===" -ForegroundColor Cyan
try { Get-Api $researcher "/marketplace/technologies" | Out-Null; Check "researcher blocked from marketplace" $false }
catch { Check "researcher blocked from marketplace" ($_.Exception.Response.StatusCode.value__ -eq 403) "(403)" }
try { Get-Api $industry "/analytics/metrics" | Out-Null; Check "industry blocked from analytics" $false }
catch { Check "industry blocked from analytics" ($_.Exception.Response.StatusCode.value__ -eq 403) "(403)" }

Write-Host "`n=== ADMIN data ===" -ForegroundColor Cyan
$metrics = Get-Api $admin "/analytics/metrics"
Check "admin /analytics/metrics" ($metrics.data.totalStudies -ge 1) "(studies=$($metrics.data.totalStudies), published=$($metrics.data.publishedStudies))"
$audit = Get-Api $admin "/audit-logs"
Check "admin /audit-logs" ($audit.success) "($($audit.data.Count) entries)"

Write-Host "`n=== WRITE FLOW: industry expresses interest ===" -ForegroundColor Cyan
$study = $techs.data[0]
try {
  $interest = Invoke-RestMethod -Uri "$base/technologies/$($study.id)/interests" -Method Post -Headers (Hdr $industry) -WebSession $industry.session -Body "{}" -ContentType "application/json"
  Check "create interest on '$($study.title)'" ($interest.success) "(status=$($interest.data.status))"
} catch { Check "create interest" $false "($($_.Exception.Message))" }
$afterInterest = Get-Api $industry "/interests"
Check "interest now visible to industry" ($afterInterest.data.Count -ge 1) "($($afterInterest.data.Count))"
$researcherInterest = Get-Api $researcher "/interests"
Check "researcher sees interest on their study" ($researcherInterest.data.Count -ge 1) "($($researcherInterest.data.Count))"

Write-Host "`n=== AI ROUTES (smoke) ===" -ForegroundColor Cyan
try {
  $ai = Invoke-RestMethod -Uri "$base/ai/health" -Headers (Hdr $industry) -WebSession $industry.session -TimeoutSec 10
  Check "ai/health reachable" ($ai.success -ne $null -or $ai -ne $null)
} catch { Write-Host "  [SKIP] ai/health: $($_.Exception.Message)" -ForegroundColor Yellow }

Write-Host "`n=== REFRESH + LOGOUT ===" -ForegroundColor Cyan
try {
  $refresh = Invoke-RestMethod -Uri "$base/auth/refresh" -Method Post -WebSession $industry.session
  Check "token refresh" ($refresh.data.accessToken -ne $null)
} catch { Check "token refresh" $false "($($_.Exception.Message))" }
$logout = Invoke-RestMethod -Uri "$base/auth/logout" -Method Post -Headers (Hdr $industry) -WebSession $industry.session
Check "logout" ($logout.success)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESULT: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
