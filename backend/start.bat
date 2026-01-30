@echo off
cd /d %~dp0
echo Starting White Dove Wellness Backend on port 8002...
set NODE_PORT=8002
node server.js
