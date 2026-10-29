@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo AEGIS DISPATCH - DATABASE BACKUP UTILITY
echo ==============================================================================

set BACKUP_DIR=data\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set SNAPSHOT_FILE=%BACKUP_DIR%\aegis_dispatch_%TIMESTAMP%.mv.db

if exist "data\aegis_dispatch.mv.db" (
    echo [INFO] Creating snapshot of H2 database file: %SNAPSHOT_FILE%
    copy "data\aegis_dispatch.mv.db" "%SNAPSHOT_FILE%" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Backup created successfully at %SNAPSHOT_FILE%
    ) else (
        echo [ERROR] Failed to copy database file. Check permissions or if DB is locked.
    )
) else (
    echo [WARNING] No local H2 database file found at data\aegis_dispatch.mv.db.
)

if defined POSTGRES_DB (
    echo [INFO] PostgreSQL environment detected. Running pg_dump...
    set PG_BACKUP=%BACKUP_DIR%\aegis_pg_%TIMESTAMP%.sql
    pg_dump -U %POSTGRES_USER% -h localhost -d %POSTGRES_DB% > "%PG_BACKUP%"
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] PostgreSQL dump created at %PG_BACKUP%
    )
)

echo ==============================================================================
