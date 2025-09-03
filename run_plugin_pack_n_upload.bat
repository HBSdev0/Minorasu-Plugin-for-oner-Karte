?@echo off
chcp 65001>nul            REM UTF-8 にして文字化け防止
setlocal

REM ===== プロジェクト設定 =====
set "PROJECT_DIR=C:\Users\Okimoto\Desktop\MOCK"
set "PPK_FILE=key.ppk"
set "PLUGIN_ZIP=plugin.zip"
set "KINTONE_URL=https://t2qazcuck22w.cybozu.com"
set "KINTONE_USER=y-okimoto"
set "KINTONE_PASS=yohot4492"

pushd "%PROJECT_DIR%"
start "" cmd /k kintone-plugin-packer --watch dist --ppk %PPK_FILE%
timeout /t 2 /nobreak >nul
start "" cmd /k kintone-plugin-uploader --base-url %KINTONE_URL% --username %KINTONE_USER% --password %KINTONE_PASS% --watch %PLUGIN_ZIP%
popd

exit /b