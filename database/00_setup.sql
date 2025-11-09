-- =====================================================
-- Database Setup Script
-- User Access Review Application
-- =====================================================

-- Drop database if exists (use with caution in production)
DROP DATABASE IF EXISTS uar_app;

-- Create database
CREATE DATABASE uar_app
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the database
\c uar_app;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types/enums
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'terminated', 'suspended');
CREATE TYPE user_role AS ENUM ('admin', 'compliance_manager', 'reviewer', 'manager', 'user');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE campaign_type AS ENUM ('manager_review', 'application_owner', 'both', 'ad_hoc');
CREATE TYPE review_decision AS ENUM ('pending', 'approved', 'revoked', 'exception', 'delegated');
CREATE TYPE sod_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE remediation_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'manual_required');
CREATE TYPE notification_channel AS ENUM ('email', 'teams', 'slack', 'whatsapp', 'web');
CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'login', 'logout', 
    'approve', 'revoke', 'delegate', 'export', 
    'campaign_start', 'campaign_complete', 'sync', 'config_change'
);

-- Comment on database
COMMENT ON DATABASE uar_app IS 'User Access Review application database for SOX compliance and IGA';