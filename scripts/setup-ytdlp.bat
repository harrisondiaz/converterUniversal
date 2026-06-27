@echo off
setlocal
cd /d "%~dp0.."
if not exist bin mkdir bin

echo Downloading yt-dlp...
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o "bin/yt-dlp.exe"
if errorlevel 1 (
  echo Download failed. Get yt-dlp manually from:
  echo https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
  exit /b 1
)

echo.
bin\yt-dlp.exe --version
echo.
echo yt-dlp installed in bin\yt-dlp.exe
echo Restart the app: npm run web  or  npm start
