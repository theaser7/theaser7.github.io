@echo off
chcp 65001 > nul
title Clarify AI Companion Server
cd /d "%~dp0utilities\clarify"
call run_companion.bat
