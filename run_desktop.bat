@echo off
title Vehicle Horn Data Collector - Desktop
cd /d "%~dp0"
python main.py
if errorlevel 1 (
    echo.
    echo Application stopped with an error code.
    pause
)
