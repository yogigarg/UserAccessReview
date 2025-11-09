-- =====================================================
-- Create Database - Cross Platform Compatible
-- =====================================================

-- Terminate existing connections (if any)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'uar_app' AND pid <> pg_backend_pid();

-- Drop database if exists
DROP DATABASE IF EXISTS uar_app;

-- Create database (without locale specifications)
CREATE DATABASE uar_app
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;