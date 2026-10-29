@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo AEGIS DISPATCH - DATABASE ROLLBACK SCRIPT RUNNER
echo ==============================================================================

set ROLLBACK_SQL=backend\src\main\resources\rollback.sql

if not exist "%ROLLBACK_SQL%" (
    echo [ERROR] Rollback SQL script not found at %ROLLBACK_SQL%
    exit /b 1
)

echo [CAUTION] This will execute rollback.sql to drop extended citizen auth columns,
echo indexes, and event tables!
set /p CONFIRM="Are you sure you want to run database rollback? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo [INFO] Rollback cancelled.
    exit /b 0
)

echo [INFO] Executing database rollback script...
if defined POSTGRES_DB (
    psql -U %POSTGRES_USER% -d %POSTGRES_DB% -f "%ROLLBACK_SQL%"
) else (
    echo [NOTE] For H2 standalone file database, rollback.sql is ready at:
    echo        %ROLLBACK_SQL%
    echo        Apply via H2 web console or Spring Boot migration runner.
)

echo [SUCCESS] Rollback procedure initiated.
echo ==============================================================================
