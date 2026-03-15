@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title KamalDoc Build Script

echo ============================================
echo   KamalDoc - Automatischer Build
echo ============================================
echo.

:: Pfade
set "PROJECT_DIR=D:\Projekte\KamalDoc"
set "FRONTEND_DIR=%PROJECT_DIR%\frontend"
set "ANDROID_DIR=%FRONTEND_DIR%\android"
set "GRADLE_FILE=%ANDROID_DIR%\app\build.gradle"
set "RELEASES_DIR=%PROJECT_DIR%\releases"
set "KEYSTORE=%ANDROID_DIR%\kamaldoc.keystore"
set "KEY_ALIAS=kamaldoc"
set "KEY_PASS=kamaldoc123"
set "STORE_PASS=kamaldoc123"

:: releases-Ordner erstellen falls noetig
if not exist "%RELEASES_DIR%" mkdir "%RELEASES_DIR%"

:: ============================================
:: SCHRITT 1: versionCode + versionName lesen und erhoehen
:: ============================================
echo [1/8] Version aus build.gradle lesen...

:: versionCode lesen
for /f "tokens=2 delims= " %%a in ('findstr /c:"versionCode" "%GRADLE_FILE%"') do set "OLD_CODE=%%a"
set /a NEW_CODE=%OLD_CODE%+1

:: versionName lesen (z.B. "1.0.2")
for /f "tokens=2 delims= " %%a in ('findstr /c:"versionName" "%GRADLE_FILE%"') do set "OLD_NAME=%%~a"

:: versionName erhoehen: letzte Zahl +1
for /f "tokens=1,2,3 delims=." %%a in ("%OLD_NAME%") do (
    set "V_MAJOR=%%a"
    set "V_MINOR=%%b"
    set /a "V_PATCH=%%c+1"
)
set "NEW_NAME=%V_MAJOR%.%V_MINOR%.%V_PATCH%"

echo     Alte Version: v%OLD_NAME% (Code: %OLD_CODE%)
echo     Neue Version: v%NEW_NAME% (Code: %NEW_CODE%)
echo.

:: build.gradle aktualisieren
echo [2/8] build.gradle aktualisieren...
powershell -Command "(Get-Content '%GRADLE_FILE%') -replace 'versionCode %OLD_CODE%', 'versionCode %NEW_CODE%' -replace 'versionName \"%OLD_NAME%\"', 'versionName \"%NEW_NAME%\"' | Set-Content '%GRADLE_FILE%'"
if errorlevel 1 (
    echo FEHLER: build.gradle konnte nicht aktualisiert werden!
    goto :error
)

:: package.json aktualisieren
echo     package.json aktualisieren...
powershell -Command "(Get-Content '%FRONTEND_DIR%\package.json') -replace '\"version\": \"%OLD_NAME%\"', '\"version\": \"%NEW_NAME%\"' | Set-Content '%FRONTEND_DIR%\package.json'"
echo     OK
echo.

:: ============================================
:: SCHRITT 2: Frontend bauen
:: ============================================
echo [3/8] npm run build...
cd /d "%FRONTEND_DIR%"
call npm run build
if errorlevel 1 (
    echo FEHLER: npm build fehlgeschlagen!
    goto :error
)
echo     OK
echo.

:: ============================================
:: SCHRITT 3: Capacitor sync
:: ============================================
echo [4/8] npx cap sync android...
call npx cap sync android
if errorlevel 1 (
    echo FEHLER: cap sync fehlgeschlagen!
    goto :error
)
echo     OK
echo.

:: ============================================
:: SCHRITT 4: APK bauen
:: ============================================
echo [5/8] APK bauen (assembleRelease)...
cd /d "%ANDROID_DIR%"
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo FEHLER: APK Build fehlgeschlagen!
    goto :error
)
echo     OK
echo.

:: ============================================
:: SCHRITT 5: AAB bauen
:: ============================================
echo [6/8] AAB bauen (bundleRelease)...
call gradlew.bat bundleRelease
if errorlevel 1 (
    echo FEHLER: AAB Build fehlgeschlagen!
    goto :error
)
echo     OK
echo.

:: ============================================
:: SCHRITT 6: Signieren + Kopieren
:: ============================================
echo [7/8] Signieren und kopieren...

set "APK_SRC=%ANDROID_DIR%\app\build\outputs\apk\release\app-release-unsigned.apk"
set "AAB_SRC=%ANDROID_DIR%\app\build\outputs\bundle\release\app-release.aab"
set "APK_DEST=%RELEASES_DIR%\KamalDoc-v%NEW_NAME%.apk"
set "AAB_DEST=%RELEASES_DIR%\KamalDoc-v%NEW_NAME%.aab"

:: APK mit apksigner signieren
:: Zuerst zipalign
set "APK_ALIGNED=%RELEASES_DIR%\app-aligned.apk"

:: Finde Android SDK Build-Tools
for /f "delims=" %%d in ('dir /b /ad /o-n "%LOCALAPPDATA%\Android\Sdk\build-tools\" 2^>nul') do (
    set "BUILD_TOOLS=%LOCALAPPDATA%\Android\Sdk\build-tools\%%d"
    goto :found_tools
)
:: Fallback: Suche in Program Files
for /f "delims=" %%d in ('dir /b /ad /o-n "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\build-tools\" 2^>nul') do (
    set "BUILD_TOOLS=C:\Users\%USERNAME%\AppData\Local\Android\Sdk\build-tools\%%d"
    goto :found_tools
)
echo WARNUNG: Android Build-Tools nicht gefunden, ueberspringe APK-Signierung.
echo          APK wird unsigniert kopiert.
copy "%APK_SRC%" "%APK_DEST%" >nul 2>&1
goto :sign_aab

:found_tools
echo     Build-Tools: %BUILD_TOOLS%

:: zipalign
"%BUILD_TOOLS%\zipalign.exe" -v -p 4 "%APK_SRC%" "%APK_ALIGNED%" >nul 2>&1
if errorlevel 1 (
    echo     WARNUNG: zipalign fehlgeschlagen, kopiere direkt...
    copy "%APK_SRC%" "%APK_ALIGNED%" >nul
)

:: apksigner
"%BUILD_TOOLS%\apksigner.bat" sign --ks "%KEYSTORE%" --ks-key-alias %KEY_ALIAS% --ks-pass pass:%STORE_PASS% --key-pass pass:%KEY_PASS% --out "%APK_DEST%" "%APK_ALIGNED%"
if errorlevel 1 (
    echo     WARNUNG: apksigner fehlgeschlagen, kopiere unsigniert...
    copy "%APK_ALIGNED%" "%APK_DEST%" >nul
) else (
    echo     APK signiert: %APK_DEST%
)
del "%APK_ALIGNED%" >nul 2>&1

:sign_aab
:: AAB mit jarsigner signieren
copy "%AAB_SRC%" "%AAB_DEST%" >nul 2>&1
jarsigner -keystore "%KEYSTORE%" -storepass %STORE_PASS% -keypass %KEY_PASS% "%AAB_DEST%" %KEY_ALIAS% >nul 2>&1
if errorlevel 1 (
    echo     WARNUNG: jarsigner fehlgeschlagen, AAB ist unsigniert.
) else (
    echo     AAB signiert: %AAB_DEST%
)
echo     OK
echo.

:: ============================================
:: SCHRITT 7: Git commit + push
:: ============================================
echo [8/8] Git commit + push...
cd /d "%PROJECT_DIR%"
git add -A
git commit -m "release: v%NEW_NAME% (build %NEW_CODE%)"
git push
if errorlevel 1 (
    echo WARNUNG: Git push fehlgeschlagen. Bitte manuell pushen.
)
echo     OK
echo.

:: ============================================
:: FERTIG
:: ============================================
echo ============================================
echo   BUILD ERFOLGREICH!
echo ============================================
echo.
echo   Version:  v%NEW_NAME% (Code: %NEW_CODE%)
echo   APK:      %APK_DEST%
echo   AAB:      %AAB_DEST%
echo.
echo ============================================
goto :end

:error
echo.
echo ============================================
echo   BUILD FEHLGESCHLAGEN!
echo ============================================
echo   Bitte Fehler oben pruefen.
echo ============================================

:end
cd /d "%PROJECT_DIR%"
pause
endlocal
