@echo off
setlocal

set "ROOT=%~dp0"

start "StoryDB API" cmd /k "cd /d ""%ROOT%StoryDB.Api"" && dotnet run --launch-profile http"
start "StoryDB Client" cmd /k "cd /d ""%ROOT%storydb.client"" && npm run dev"

timeout /t 3 /nobreak > nul
start "" "http://localhost:50201"

endlocal
