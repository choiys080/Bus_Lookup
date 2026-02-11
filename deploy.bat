@echo off
echo Deploying to GitHub Pages...
echo.

REM Switch to main branch
git checkout main

REM Merge your feature branch
git merge feature/client-request-integration

REM Push to GitHub (deploys site)
git push origin main

echo.
echo ✅ Deployed! Your site is live at:
echo https://choiys080.github.io/Bus_Lookup/
echo.
pause
