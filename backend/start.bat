@echo off
cd /d %~dp0
echo Starting White Dove Wellness Backend on port 3003...
set NODE_PORT=3003
node server.js
