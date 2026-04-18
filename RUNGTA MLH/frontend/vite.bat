@echo off
REM Helper scripts for VERITAS X frontend (workaround for & in path)
cd /d "%~dp0"
node_modules\.bin\vite.cmd %*
