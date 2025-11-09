@echo off
REM =====================================================
REM Database Setup Script for Windows
REM User Access Review Application
REM =====================================================

SET PSQL_PATH="C:\Program Files\PostgreSQL\18\bin\psql.exe"
SET DB_NAME=uar_app
SET DB_USER=postgres
SET DB_HOST=localhost
SET DB_PORT=5432

echo =========================================
echo User Access Review - Database Setup
echo =========================================
echo.

SET /P DB_PASSWORD="Enter PostgreSQL password for user postgres: "

echo.
echo Checking PostgreSQL connection...
SET PGPASSWORD=%DB_PASSWORD%
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "SELECT version();" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Cannot connect to PostgreSQL
    echo Please check if PostgreSQL is running and password is correct
    pause
    exit /b 1
)
echo SUCCESS: PostgreSQL is running
echo.

echo =========================================
echo Starting database setup...
echo =========================================
echo.

REM Step 1: Create Database
echo [1/6] Creating database...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -f 00a_create_database.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)
echo SUCCESS: Database created
echo.

REM Step 2: Create Extensions and Types
echo [2/6] Creating extensions and types...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f 00b_setup_extensions.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create extensions
    pause
    exit /b 1
)
echo SUCCESS: Extensions created
echo.

REM Step 3: Create Schema
echo [3/6] Creating schema...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f 01_schema.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create schema
    pause
    exit /b 1
)
echo SUCCESS: Schema created
echo.

REM Step 4: Insert Seed Data
echo [4/6] Inserting seed data...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f 02_seed_data.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to insert seed data
    pause
    exit /b 1
)
echo SUCCESS: Seed data inserted
echo.

REM Step 5: Create Indexes
echo [5/6] Creating indexes...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f 03_indexes.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create indexes
    pause
    exit /b 1
)
echo SUCCESS: Indexes created
echo.

REM Step 6: Create Stored Procedures
echo [6/6] Creating stored procedures and functions...
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f 04_stored_procedures.sql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create stored procedures
    pause
    exit /b 1
)
echo SUCCESS: Stored procedures created
echo.

REM Verify Installation
echo =========================================
echo Verifying installation...
echo =========================================
echo.
%PSQL_PATH% -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -c "SELECT 'Tables:' as type, COUNT(*)::text as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' UNION ALL SELECT 'Users:', COUNT(*)::text FROM users UNION ALL SELECT 'Applications:', COUNT(*)::text FROM applications;"

echo.
echo =========================================
echo Database setup completed successfully!
echo =========================================
echo.
echo Database Name: %DB_NAME%
echo Default Admin: admin@acme.com
echo Default Password: Admin@123
echo.
echo Sample test accounts:
echo   - Compliance Manager: jane.smith@acme.com / Admin@123
echo   - IT Manager: john.doe@acme.com / Admin@123
echo   - Finance Manager: sarah.johnson@acme.com / Admin@123
echo.
echo Connection string for your application:
echo postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.

SET PGPASSWORD=
pause