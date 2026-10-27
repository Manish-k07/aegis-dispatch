@echo off
title AEGIS DISPATCH - Backend Server (Port 8080)
cd /d "%~dp0backend"
echo ===================================================
echo Starting AEGIS DISPATCH Backend (Spring Boot 3.5 / Java 21)
echo Database: Embedded H2 (PostgreSQL Mode)
echo URL: http://localhost:8080
echo Health: http://localhost:8080/actuator/health
echo Readiness: http://localhost:8080/actuator/health/readiness
echo OpenAPI Docs: http://localhost:8080/v3/api-docs
echo Swagger UI: http://localhost:8080/swagger-ui.html
echo ===================================================

set "MVN_CMD=mvn"
if exist "C:\Program Files\apache-maven-3.9.11\bin\mvn.cmd" (
    set "MVN_CMD=C:\Program Files\apache-maven-3.9.11\bin\mvn.cmd"
) else if exist "%~dp0backend\mvnw.cmd" (
    set "MVN_CMD=%~dp0backend\mvnw.cmd"
)

call "%MVN_CMD%" spring-boot:run
pause
