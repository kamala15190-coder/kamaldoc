<#
  KamalDoc — Live Device Log Monitor
  ----------------------------------
  Streams a connected Android device's logcat (WebView console, network errors,
  Supabase/auth, Capacitor bridge, native crashes) into a timestamped logfile so
  we can watch a real login/upload attempt on the phone in real time.

  Usage (from frontend/):
    powershell -ExecutionPolicy Bypass -File scripts/device-log-monitor.ps1

  Notes:
   * The phone must be connected with USB debugging enabled (or wireless adb).
   * JS console (console.log/error from the WebView) only reaches logcat when the
     installed build is DEBUGGABLE, or when capacitor.config sets
     loggingBehavior: 'production'. A Play Store release build stays silent on the
     JS console — install a debug build for full visibility.
#>
param(
  [string]$Package = "at.kamaldoc.app",
  [string]$OutDir  = "$PSScriptRoot\..\.devlogs"
)

$ErrorActionPreference = "Stop"

# --- locate adb -------------------------------------------------------------
$adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if (-not $adb) {
  $adb = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $adb) {
  Write-Host "[monitor] adb not found. Install Android platform-tools or add adb to PATH." -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp   = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $OutDir "device-$stamp.log"

Write-Host "[monitor] adb: $adb"
Write-Host "[monitor] Waiting for a device (enable USB debugging + plug in, or 'adb connect <ip>')..." -ForegroundColor Cyan
& $adb wait-for-device

$model = (& $adb shell getprop ro.product.model 2>$null)
$andro = (& $adb shell getprop ro.build.version.release 2>$null)
Write-Host "[monitor] Connected: $model (Android $andro)" -ForegroundColor Green
Write-Host "[monitor] Writing log -> $logFile" -ForegroundColor Green
Write-Host "[monitor] Reproduce the login / upload on the phone now. Ctrl+C to stop." -ForegroundColor Yellow

# Header so the agent can find the start of this session in the file.
"==== KamalDoc device log $stamp | $model Android $andro ====" | Out-File -FilePath $logFile -Encoding utf8

# Clear the ring buffer so we only capture this session.
& $adb logcat -c 2>$null

# Keep only lines relevant to the app / web / network / auth / crashes, tag and
# persist them. Broad on purpose so we never miss the actual failure.
$keep  = "Capacitor|Console|chromium|$([regex]::Escape($Package))|AndroidRuntime|System\.err|net::|ERR_|CapacitorHttp|OkHttp|NetworkSecurity|CORS|Supabase|supabase|kdoc|Authorization|Unauthorized|401|403|500|Network Error|getSession"
$errRx = "Error|FATAL|Exception|net::ERR|ERR_|failed|Failed|401|403|50\d|Network Error|Unauthorized|denied"

& $adb logcat -v time | ForEach-Object {
  if ($_ -match $keep) {
    Add-Content -Path $logFile -Value $_
    if ($_ -match $errRx) { Write-Host $_ -ForegroundColor Red }
    else                  { Write-Host $_ -ForegroundColor Gray }
  }
}
