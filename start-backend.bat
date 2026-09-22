@echo off
title AEGIS DISPATCH - Backend Server (Port 8080)
cd /d "%~dp0backend"
echo ===================================================
echo Starting AEGIS DISPATCH Backend (Spring Boot 3.5 / Java 21)
echo Database: Embedded H2 (PostgreSQL Mode) + Seed Data Loaded
echo URL: http://localhost:8080
echo Health: http://localhost:8080/actuator/health
echo WebSocket: ws://localhost:8080/ws/live
echo ===================================================
"C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.2.4\plugins\maven\lib\maven3\bin\mvn.cmd" -s "D:\m2\settings.xml" spring-boot:run
pause
