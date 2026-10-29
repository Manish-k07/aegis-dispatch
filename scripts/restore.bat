@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo AEGIS DISPATCH - DATABASE RESTORE UTILITY
echo ==============================================================================

if "%~1"=="" (
    echo [USAGE] restore.bat ^<path_to_backup_file^>
    echo [EXAMPLE] restore.bat data\backups\aegis_dispatch_20261029_100000.mv.db
    exit /b 1
)

set BACKUP_FILE=%~1

if not exist "%BACKUP_FILE%" (
    echo [ERROR] Specified backup file does not exist: %BACKUP_FILE%
    exit /b 1
)

echo [CAUTION] This operation will replace the active database with %BACKUP_FILE%!
set /p CONFIRM="Are you sure you want to proceed? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo [INFO] Restore operation cancelled.
    exit /b 0
)

echo [INFO] Restoring database file...
copy /y "%BACKUP_FILE%" "data\aegis_dispatch.mv.db" >nul

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Database restored successfully from %BACKUP_FILE%
    echo [NOTE] Please restart the Aegis Dispatch backend service.
) else (
    echo [ERROR] Restore failed. Ensure backend service is stopped before restoring.
)

echo ==============================================================================
