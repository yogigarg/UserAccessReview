-- =====================================================
-- Seed Data - User Access Review Application
-- =====================================================

-- ============================================
-- ORGANIZATION & DEPARTMENTS
-- ============================================

-- Insert Sample Organization
INSERT INTO organizations (id, name, code, domain, settings, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'ACME', 'acme.com', 
 '{"fiscal_year_start": "01-01", "timezone": "America/New_York", "currency": "USD"}', true);

-- Insert Departments
INSERT INTO departments (id, organization_id, name, code, parent_department_id, cost_center, location) VALUES
('22222222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'Information Technology', 'IT', NULL, 'CC-1000', 'New York'),
('22222222-2222-2222-2222-111111111112', '11111111-1111-1111-1111-111111111111', 'Finance', 'FIN', NULL, 'CC-2000', 'New York'),
('22222222-2222-2222-2222-111111111113', '11111111-1111-1111-1111-111111111111', 'Human Resources', 'HR', NULL, 'CC-3000', 'Chicago'),
('22222222-2222-2222-2222-111111111114', '11111111-1111-1111-1111-111111111111', 'Sales', 'SALES', NULL, 'CC-4000', 'San Francisco'),
('22222222-2222-2222-2222-111111111115', '11111111-1111-1111-1111-111111111111', 'Operations', 'OPS', NULL, 'CC-5000', 'Chicago'),
('22222222-2222-2222-2222-111111111116', '11111111-1111-1111-1111-111111111111', 'IT Security', 'IT-SEC', '22222222-2222-2222-2222-111111111111', 'CC-1100', 'New York'),
('22222222-2222-2222-2222-111111111117', '11111111-1111-1111-1111-111111111111', 'Accounting', 'ACC', '22222222-2222-2222-2222-111111111112', 'CC-2100', 'New York');

-- ============================================
-- USERS (Including system admin and reviewers)
-- ============================================

-- Admin User
INSERT INTO users (id, organization_id, employee_id, email, first_name, last_name, username, 
    password_hash, role, department_id, job_title, status, hire_date) VALUES
('33333333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'EMP001', 
 'admin@acme.com', 'System', 'Admin', 'admin', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy', -- password: Admin@123
 'admin', '22222222-2222-2222-2222-111111111111', 'System Administrator', 'active', '2020-01-15');

-- Compliance Manager
INSERT INTO users (id, organization_id, employee_id, email, first_name, last_name, username, 
    password_hash, role, department_id, manager_id, job_title, status, hire_date) VALUES
('33333333-3333-3333-3333-111111111112', '11111111-1111-1111-1111-111111111111', 'EMP002', 
 'jane.smith@acme.com', 'Jane', 'Smith', 'jsmith', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'compliance_manager', '22222222-2222-2222-2222-111111111112', '33333333-3333-3333-3333-111111111111', 
 'Compliance Manager', 'active', '2020-03-10');

-- IT Manager
INSERT INTO users (id, organization_id, employee_id, email, first_name, last_name, username, 
    password_hash, role, department_id, manager_id, job_title, status, hire_date) VALUES
('33333333-3333-3333-3333-111111111113', '11111111-1111-1111-1111-111111111111', 'EMP003', 
 'john.doe@acme.com', 'John', 'Doe', 'jdoe', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'manager', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111111', 
 'IT Manager', 'active', '2019-05-20');

-- Finance Manager
INSERT INTO users (id, organization_id, employee_id, email, first_name, last_name, username, 
    password_hash, role, department_id, manager_id, job_title, status, hire_date) VALUES
('33333333-3333-3333-3333-111111111114', '11111111-1111-1111-1111-111111111111', 'EMP004', 
 'sarah.johnson@acme.com', 'Sarah', 'Johnson', 'sjohnson', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'manager', '22222222-2222-2222-2222-111111111112', '33333333-3333-3333-3333-111111111111', 
 'Finance Manager', 'active', '2018-07-01');

-- Regular Users (Team members)
INSERT INTO users (organization_id, employee_id, email, first_name, last_name, username, 
    password_hash, role, department_id, manager_id, job_title, status, hire_date) VALUES
('11111111-1111-1111-1111-111111111111', 'EMP005', 'bob.wilson@acme.com', 'Bob', 'Wilson', 'bwilson', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111113', 
 'Senior Developer', 'active', '2021-02-15'),
('11111111-1111-1111-1111-111111111111', 'EMP006', 'alice.brown@acme.com', 'Alice', 'Brown', 'abrown', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111113', 
 'DevOps Engineer', 'active', '2021-06-10'),
('11111111-1111-1111-1111-111111111111', 'EMP007', 'michael.davis@acme.com', 'Michael', 'Davis', 'mdavis', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111112', '33333333-3333-3333-3333-111111111114', 
 'Financial Analyst', 'active', '2020-09-01'),
('11111111-1111-1111-1111-111111111111', 'EMP008', 'emily.taylor@acme.com', 'Emily', 'Taylor', 'etaylor', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111112', '33333333-3333-3333-3333-111111111114', 
 'Accounts Payable Specialist', 'active', '2021-01-20'),
('11111111-1111-1111-1111-111111111111', 'EMP009', 'david.martinez@acme.com', 'David', 'Martinez', 'dmartinez', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111113', NULL, 
 'HR Coordinator', 'active', '2019-11-05'),
('11111111-1111-1111-1111-111111111111', 'EMP010', 'lisa.anderson@acme.com', 'Lisa', 'Anderson', 'landerson', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111114', NULL, 
 'Sales Representative', 'active', '2022-03-15'),
('11111111-1111-1111-1111-111111111111', 'EMP011', 'james.thomas@acme.com', 'James', 'Thomas', 'jthomas', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111115', NULL, 
 'Operations Analyst', 'active', '2020-12-01'),
-- Contractor
('11111111-1111-1111-1111-111111111111', 'CTR001', 'contractor@acme.com', 'Tom', 'Contractor', 'tcontractor', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111111', '33333333-3333-3333-3333-111111111113', 
 'Contract Developer', 'active', '2023-01-15', NULL, NULL, true, false),
-- Service Account
('11111111-1111-1111-1111-111111111111', 'SVC001', 'svc.backup@acme.com', 'Backup', 'Service', 'svc_backup', 
 NULL, 'user', '22222222-2222-2222-2222-111111111111', NULL, 
 'Service Account', 'active', '2020-01-01', NULL, NULL, true, false),
-- Terminated User
('11111111-1111-1111-1111-111111111111', 'EMP012', 'terminated.user@acme.com', 'Terminated', 'User', 'tuser', 
 '$2b$10$rWqK3kJqxOgCj9aVqKvPHOHjKxZ5x3Q8tJKtYuP3gKwU8nYdZKqNy',
 'user', '22222222-2222-2222-2222-111111111114', NULL, 
 'Former Sales Rep', 'terminated', '2021-05-01', '2024-10-31');

-- Update department managers
UPDATE departments SET manager_id = '33333333-3333-3333-3333-111111111113' WHERE id = '22222222-2222-2222-2222-111111111111';
UPDATE departments SET manager_id = '33333333-3333-3333-3333-111111111114' WHERE id = '22222222-2222-2222-2222-111111111112';

-- ============================================
-- APPLICATIONS & SYSTEMS
-- ============================================

INSERT INTO applications (id, organization_id, name, code, description, application_type, vendor, 
    owner_id, business_criticality, compliance_scope, connector_type, is_active, risk_score) VALUES
('44444444-4444-4444-4444-111111111111', '11111111-1111-1111-1111-111111111111', 
 'Active Directory', 'AD', 'Corporate Active Directory', 'Directory', 'Microsoft', 
 '33333333-3333-3333-3333-111111111113', 'critical', 'SOX', 'active_directory', true, 85),
('44444444-4444-4444-4444-111111111112', '11111111-1111-1111-1111-111111111111', 
 'Azure Active Directory', 'AAD', 'Cloud Identity Provider', 'Directory', 'Microsoft', 
 '33333333-3333-3333-3333-111111111113', 'critical', 'SOX', 'azure_ad', true, 80),
('44444444-4444-4444-4444-111111111113', '11111111-1111-1111-1111-111111111111', 
 'SAP ERP', 'SAP', 'Enterprise Resource Planning System', 'ERP', 'SAP', 
 '33333333-3333-3333-3333-111111111114', 'critical', 'SOX', 'sap', true, 95),
('44444444-4444-4444-4444-111111111114', '11111111-1111-1111-1111-111111111111', 
 'Salesforce', 'SFDC', 'Customer Relationship Management', 'CRM', 'Salesforce', 
 NULL, 'high', 'SOX', 'salesforce', true, 70),
('44444444-4444-4444-4444-111111111115', '11111111-1111-1111-1111-111111111111', 
 'Workday', 'WD', 'HR Management System', 'HRMS', 'Workday', 
 NULL, 'high', 'SOX', 'workday', true, 75),
('44444444-4444-4444-4444-111111111116', '11111111-1111-1111-1111-111111111111', 
 'ServiceNow', 'SNOW', 'IT Service Management', 'ITSM', 'ServiceNow', 
 '33333333-3333-3333-3333-111111111113', 'high', NULL, 'servicenow', true, 60),
('44444444-4444-4444-4444-111111111117', '11111111-1111-1111-1111-111111111111', 
 'GitHub Enterprise', 'GH', 'Source Code Repository', 'DevOps', 'GitHub', 
 '33333333-3333-3333-3333-111111111113', 'medium', NULL, 'github', true, 55),
('44444444-4444-4444-4444-111111111118', '11111111-1111-1111-1111-111111111111', 
 'AWS Console', 'AWS', 'Cloud Infrastructure', 'Cloud', 'Amazon', 
 '33333333-3333-3333-3333-111111111113', 'critical', NULL, 'aws', true, 90),
('44444444-4444-4444-4444-111111111119', '11111111-1111-1111-1111-111111111111', 
 'Oracle Financials', 'ORC-FIN', 'Financial Management System', 'ERP', 'Oracle', 
 '33333333-3333-3333-3333-111111111114', 'critical', 'SOX', 'oracle', true, 85);

-- ============================================
-- ROLES
-- ============================================

-- Active Directory Roles
INSERT INTO roles (application_id, name, code, description, role_type, risk_level, is_sensitive) VALUES
('44444444-4444-4444-4444-111111111111', 'Domain User', 'AD-USER', 'Standard domain user access', 'Standard', 'low', false),
('44444444-4444-4444-4444-111111111111', 'Domain Admin', 'AD-ADMIN', 'Full domain administrative access', 'Privileged', 'critical', true),
('44444444-4444-4444-4444-111111111111', 'Server Admin', 'AD-SVRADMIN', 'Server administration rights', 'Privileged', 'high', true),
('44444444-4444-4444-4444-111111111111', 'Help Desk', 'AD-HELPDESK', 'Help desk support access', 'Standard', 'medium', false);

-- SAP Roles
INSERT INTO roles (application_id, name, code, description, role_type, risk_level, is_sensitive, requires_justification) VALUES
('44444444-4444-4444-4444-111111111113', 'Sales Order Creator', 'SAP-SO-CREATE', 'Create sales orders', 'Standard', 'medium', false, false),
('44444444-4444-4444-4444-111111111113', 'Credit Approver', 'SAP-CREDIT-APP', 'Approve credit limits', 'Standard', 'high', true, true),
('44444444-4444-4444-4444-111111111113', 'Payment Processor', 'SAP-PAY-PROC', 'Process payments', 'Standard', 'high', true, true),
('44444444-4444-4444-4444-111111111113', 'Vendor Master', 'SAP-VENDOR-MSTR', 'Maintain vendor master data', 'Standard', 'medium', true, true),
('44444444-4444-4444-4444-111111111113', 'Financial Reporter', 'SAP-FIN-REPORT', 'View financial reports', 'Standard', 'low', false, false),
('44444444-4444-4444-4444-111111111113', 'SAP Basis Admin', 'SAP-BASIS', 'SAP system administration', 'Privileged', 'critical', true, true);

-- Salesforce Roles
INSERT INTO roles (application_id, name, code, description, role_type, risk_level, is_sensitive) VALUES
('44444444-4444-4444-4444-111111111114', 'Sales User', 'SFDC-SALES', 'Standard sales user', 'Standard', 'low', false),
('44444444-4444-4444-4444-111111111114', 'System Administrator', 'SFDC-ADMIN', 'Full system admin access', 'Privileged', 'critical', true),
('44444444-4444-4444-4444-111111111114', 'Marketing User', 'SFDC-MARKETING', 'Marketing automation access', 'Standard', 'low', false);

-- AWS Roles
INSERT INTO roles (application_id, name, code, description, role_type, risk_level, is_sensitive) VALUES
('44444444-4444-4444-4444-111111111118', 'Developer', 'AWS-DEV', 'Developer access to AWS resources', 'Standard', 'medium', false),
('44444444-4444-4444-4444-111111111118', 'Administrator', 'AWS-ADMIN', 'Full AWS administrative access', 'Privileged', 'critical', true),
('44444444-4444-4444-4444-111111111118', 'Read Only', 'AWS-RO', 'Read-only access to AWS resources', 'Standard', 'low', false);

-- Oracle Financials Roles
INSERT INTO roles (application_id, name, code, description, role_type, risk_level, is_sensitive) VALUES
('44444444-4444-4444-4444-111111111119', 'GL Accountant', 'ORC-GL-ACC', 'General ledger accountant', 'Standard', 'medium', false),
('44444444-4444-4444-4444-111111111119', 'AP Clerk', 'ORC-AP-CLERK', 'Accounts payable clerk', 'Standard', 'medium', true),
('44444444-4444-4444-4444-111111111119', 'AR Clerk', 'ORC-AR-CLERK', 'Accounts receivable clerk', 'Standard', 'medium', true),
('44444444-4444-4444-4444-111111111119', 'Finance Manager', 'ORC-FIN-MGR', 'Financial management access', 'Privileged', 'high', true);

-- ============================================
-- USER ACCESS (Sample Access Assignments)
-- ============================================

-- Get user IDs first (for readability in subsequent inserts)
DO $$
DECLARE
    admin_id UUID := '33333333-3333-3333-3333-111111111111';
    jsmith_id UUID := '33333333-3333-3333-3333-111111111112';
    jdoe_id UUID := '33333333-3333-3333-3333-111111111113';
    sjohnson_id UUID := '33333333-3333-3333-3333-111111111114';
    bwilson_id UUID;
    abrown_id UUID;
    mdavis_id UUID;
    etaylor_id UUID;
BEGIN
    SELECT id INTO bwilson_id FROM users WHERE email = 'bob.wilson@acme.com';
    SELECT id INTO abrown_id FROM users WHERE email = 'alice.brown@acme.com';
    SELECT id INTO mdavis_id FROM users WHERE email = 'michael.davis@acme.com';
    SELECT id INTO etaylor_id FROM users WHERE email = 'emily.taylor@acme.com';

    -- Admin access
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score) 
    SELECT admin_id, a.id, r.id, 'Direct', '2020-01-15', admin_id, 'System Administrator', CURRENT_DATE - INTERVAL '2 days', 500, 85
    FROM applications a 
    JOIN roles r ON r.application_id = a.id 
    WHERE a.code = 'AD' AND r.code = 'AD-ADMIN';

    -- Jane Smith (Compliance Manager) - various systems
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (jsmith_id, '44444444-4444-4444-4444-111111111111', 
     (SELECT id FROM roles WHERE code = 'AD-USER'), 'Direct', '2020-03-10', admin_id, 'Standard user access', CURRENT_DATE - INTERVAL '1 day', 300, 20),
    (jsmith_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-FIN-REPORT'), 'Direct', '2020-03-10', sjohnson_id, 'Compliance reporting', CURRENT_DATE - INTERVAL '3 days', 120, 30);

    -- John Doe (IT Manager) - high privileges
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (jdoe_id, '44444444-4444-4444-4444-111111111111', 
     (SELECT id FROM roles WHERE code = 'AD-ADMIN'), 'Direct', '2019-05-20', admin_id, 'IT Manager - directory management', CURRENT_DATE - INTERVAL '1 day', 450, 85),
    (jdoe_id, '44444444-4444-4444-4444-111111111118', 
     (SELECT id FROM roles WHERE code = 'AWS-ADMIN'), 'Direct', '2019-05-20', admin_id, 'Cloud infrastructure management', CURRENT_DATE, 280, 90);

    -- Sarah Johnson (Finance Manager)
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (sjohnson_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-FIN-REPORT'), 'Direct', '2018-07-01', admin_id, 'Financial management and reporting', CURRENT_DATE, 600, 40),
    (sjohnson_id, '44444444-4444-4444-4444-111111111119', 
     (SELECT id FROM roles WHERE code = 'ORC-FIN-MGR'), 'Direct', '2018-07-01', admin_id, 'Finance manager role', CURRENT_DATE - INTERVAL '2 days', 400, 75);

    -- Bob Wilson (Developer)
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (bwilson_id, '44444444-4444-4444-4444-111111111111', 
     (SELECT id FROM roles WHERE code = 'AD-USER'), 'Direct', '2021-02-15', jdoe_id, 'Standard employee access', CURRENT_DATE, 200, 20),
    (bwilson_id, '44444444-4444-4444-4444-111111111117', 
     (SELECT id FROM roles WHERE code IN (SELECT code FROM roles WHERE application_id = '44444444-4444-4444-4444-111111111117' LIMIT 1)), 
     'Direct', '2021-02-15', jdoe_id, 'Source code access for development', CURRENT_DATE, 350, 50),
    (bwilson_id, '44444444-4444-4444-4444-111111111118', 
     (SELECT id FROM roles WHERE code = 'AWS-DEV'), 'Direct', '2021-02-15', jdoe_id, 'Development environment access', CURRENT_DATE - INTERVAL '1 day', 280, 55);

    -- Alice Brown (DevOps)
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (abrown_id, '44444444-4444-4444-4444-111111111118', 
     (SELECT id FROM roles WHERE code = 'AWS-ADMIN'), 'Direct', '2021-06-10', jdoe_id, 'DevOps infrastructure management', CURRENT_DATE, 500, 90),
    (abrown_id, '44444444-4444-4444-4444-111111111116', 
     (SELECT id FROM roles WHERE code IN (SELECT code FROM roles WHERE application_id = '44444444-4444-4444-4444-111111111116' LIMIT 1)), 
     'Direct', '2021-06-10', jdoe_id, 'ITSM access for deployment', CURRENT_DATE - INTERVAL '2 days', 150, 60);

    -- Michael Davis (Financial Analyst) - SOD VIOLATION CANDIDATE
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (mdavis_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-SO-CREATE'), 'Direct', '2020-09-01', sjohnson_id, 'Sales order creation', CURRENT_DATE - INTERVAL '5 days', 80, 50),
    (mdavis_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-CREDIT-APP'), 'Direct', '2020-09-01', sjohnson_id, 'Credit approval', CURRENT_DATE - INTERVAL '10 days', 25, 70);

    -- Emily Taylor (AP Specialist) - SOD VIOLATION CANDIDATE
    INSERT INTO user_access (user_id, application_id, role_id, access_type, grant_date, granted_by, business_justification, last_used_date, usage_count, risk_score)
    VALUES
    (etaylor_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-VENDOR-MSTR'), 'Direct', '2021-01-20', sjohnson_id, 'Vendor master maintenance', CURRENT_DATE - INTERVAL '7 days', 45, 60),
    (etaylor_id, '44444444-4444-4444-4444-111111111113', 
     (SELECT id FROM roles WHERE code = 'SAP-PAY-PROC'), 'Direct', '2021-01-20', sjohnson_id, 'Payment processing', CURRENT_DATE - INTERVAL '1 day', 90, 75);

END $$;

-- ============================================
-- SOD RULE TEMPLATES
-- ============================================

INSERT INTO sod_rule_templates (id, name, description, process_area, is_standard, template_config) VALUES
('55555555-5555-5555-5555-111111111111', 'Order-to-Cash: Create & Approve', 
 'Prevent users from both creating sales orders and approving credit', 'O2C', true,
 '{"conflicting_functions": ["create_order", "approve_credit"], "risk_description": "Could create and approve own orders"}'),
('55555555-5555-5555-5555-111111111112', 'Procure-to-Pay: Vendor & Payment', 
 'Prevent users from both maintaining vendors and processing payments', 'P2P', true,
 '{"conflicting_functions": ["vendor_master", "payment_processing"], "risk_description": "Could create fake vendors and pay them"}'),
('55555555-5555-5555-5555-111111111113', 'Record-to-Report: Journal Entry & Approval', 
 'Prevent users from both creating and approving journal entries', 'R2R', true,
 '{"conflicting_functions": ["create_journal", "approve_journal"], "risk_description": "Could manipulate financial statements"}');

-- ============================================
-- SOD RULES
-- ============================================

INSERT INTO sod_rules (id, organization_id, template_id, name, description, severity, process_area, 
    conflicting_roles, application_ids, auto_remediate, requires_exception_approval, is_active) VALUES
('66666666-6666-6666-6666-111111111111', '11111111-1111-1111-1111-111111111111', 
 '55555555-5555-5555-5555-111111111111', 
 'SAP O2C: Sales Order Create + Credit Approve', 
 'Users should not have both sales order creation and credit approval rights',
 'high', 'O2C',
 jsonb_build_array(
     jsonb_build_object('role_code', 'SAP-SO-CREATE'),
     jsonb_build_object('role_code', 'SAP-CREDIT-APP')
 ),
 ARRAY['44444444-4444-4444-4444-111111111113']::UUID[],
 false, true, true),
('66666666-6666-6666-6666-111111111112', '11111111-1111-1111-1111-111111111111', 
 '55555555-5555-5555-5555-111111111112', 
 'SAP P2P: Vendor Master + Payment Processing', 
 'Users should not maintain vendor records and process payments',
 'critical', 'P2P',
 jsonb_build_array(
     jsonb_build_object('role_code', 'SAP-VENDOR-MSTR'),
     jsonb_build_object('role_code', 'SAP-PAY-PROC')
 ),
 ARRAY['44444444-4444-4444-4444-111111111113']::UUID[],
 false, true, true);

-- ============================================
-- SOD VIOLATIONS (Detected based on user access)
-- ============================================

-- Detect violations for Michael Davis (Sales Order + Credit Approval)
INSERT INTO sod_violations (rule_id, user_id, violation_details, detected_at, is_resolved)
SELECT 
    '66666666-6666-6666-6666-111111111111',
    u.id,
    jsonb_build_object(
        'user', jsonb_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name, 'email', u.email),
        'conflicting_access', jsonb_build_array(
            jsonb_build_object('role', 'SAP-SO-CREATE', 'granted_date', '2020-09-01'),
            jsonb_build_object('role', 'SAP-CREDIT-APP', 'granted_date', '2020-09-01')
        ),
        'risk_description', 'Can create and approve own sales orders'
    ),
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    false
FROM users u
WHERE u.email = 'michael.davis@acme.com';

-- Detect violations for Emily Taylor (Vendor Master + Payment)
INSERT INTO sod_violations (rule_id, user_id, violation_details, detected_at, is_resolved)
SELECT 
    '66666666-6666-6666-6666-111111111112',
    u.id,
    jsonb_build_object(
        'user', jsonb_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name, 'email', u.email),
        'conflicting_access', jsonb_build_array(
            jsonb_build_object('role', 'SAP-VENDOR-MSTR', 'granted_date', '2021-01-20'),
            jsonb_build_object('role', 'SAP-PAY-PROC', 'granted_date', '2021-01-20')
        ),
        'risk_description', 'Can create vendors and process payments to them'
    ),
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    false
FROM users u
WHERE u.email = 'emily.taylor@acme.com';

-- Update violation counts
UPDATE sod_rules SET violation_count = (
    SELECT COUNT(*) FROM sod_violations WHERE rule_id = sod_rules.id AND is_resolved = false
), last_evaluated_at = CURRENT_TIMESTAMP;

-- ============================================
-- SAMPLE CAMPAIGN
-- ============================================

INSERT INTO campaigns (id, organization_id, name, description, campaign_type, status, scope_config, 
    start_date, end_date, reminder_frequency, escalation_enabled, total_reviews, created_by, launched_at) VALUES
('77777777-7777-7777-7777-111111111111', '11111111-1111-1111-1111-111111111111', 
 'Q4 2024 Quarterly Access Review', 
 'Quarterly access recertification for all employees - SOX compliance',
 'manager_review', 'active',
 '{"departments": ["IT", "Finance"], "include_contractors": true, "min_risk_score": 0}',
 '2024-10-01', '2024-10-31', 3, true, 0,
 '33333333-3333-3333-3333-111111111112',
 '2024-10-01 09:00:00-04');

-- ============================================
-- NOTIFICATION TEMPLATES
-- ============================================

INSERT INTO notification_templates (organization_id, name, template_type, channel, subject, body_template, variables) VALUES
('11111111-1111-1111-1111-111111111111', 'Campaign Launch Notification', 'campaign_start', 'email',
 'Action Required: Access Review Campaign Started',
 'Hi {{reviewer_name}},

A new access review campaign "{{campaign_name}}" has been launched and requires your attention.

Campaign Period: {{start_date}} to {{end_date}}
Items to Review: {{review_count}}

Please log in to the UAR portal to complete your reviews: {{portal_url}}

If you have any questions, please contact the Compliance team.

Thank you,
Compliance Team',
 '["reviewer_name", "campaign_name", "start_date", "end_date", "review_count", "portal_url"]'),

('11111111-1111-1111-1111-111111111111', 'Review Reminder', 'reminder', 'email',
 'Reminder: {{review_count}} Access Reviews Pending',
 'Hi {{reviewer_name}},

This is a friendly reminder that you have {{review_count}} pending access reviews for the campaign "{{campaign_name}}".

Days remaining: {{days_remaining}}
Completion percentage: {{completion_percentage}}%

Please complete your reviews at: {{portal_url}}

Thank you,
Compliance Team',
 '["reviewer_name", "campaign_name", "review_count", "days_remaining", "completion_percentage", "portal_url"]');

-- ============================================
-- SYSTEM CONFIGURATION
-- ============================================

INSERT INTO system_config (organization_id, config_key, config_value, description, is_system_level) VALUES
('11111111-1111-1111-1111-111111111111', 'session_timeout_minutes', '60', 'User session timeout in minutes', false),
('11111111-1111-1111-1111-111111111111', 'mfa_required_for_admins', 'true', 'Require MFA for admin users', false),
('11111111-1111-1111-1111-111111111111', 'audit_log_retention_days', '2555', 'Audit log retention period (7 years)', false),
('11111111-1111-1111-1111-111111111111', 'max_login_attempts', '5', 'Maximum failed login attempts before lockout', false),
('11111111-1111-1111-1111-111111111111', 'password_min_length', '12', 'Minimum password length', false),
('11111111-1111-1111-1111-111111111111', 'campaign_default_duration_days', '30', 'Default campaign duration', false),
(NULL, 'system_email_from', '"UAR System" <noreply@uar-system.com>', 'System email sender', true),
(NULL, 'enable_slack_integration', 'true', 'Enable Slack notifications', true),
(NULL, 'enable_teams_integration', 'true', 'Enable Microsoft Teams notifications', true);

-- ============================================
-- FEATURE FLAGS
-- ============================================

INSERT INTO feature_flags (organization_id, feature_name, is_enabled, rollout_percentage, metadata) VALUES
('11111111-1111-1111-1111-111111111111', 'ai_risk_scoring', false, 0, '{"beta": true, "release_date": "2025-Q2"}'),
('11111111-1111-1111-1111-111111111111', 'continuous_monitoring', false, 0, '{"beta": true, "release_date": "2025-Q3"}'),
('11111111-1111-1111-1111-111111111111', 'mobile_app', false, 0, '{"beta": true, "release_date": "2025-Q4"}'),
('11111111-1111-1111-1111-111111111111', 'omnichannel_approvals', true, 100, '{"channels": ["email", "teams", "slack"]}'),
('11111111-1111-1111-1111-111111111111', 'advanced_analytics', true, 100, '{"dashboards": ["executive", "compliance", "operations"]}');

-- Verify seed data
SELECT 'Organizations:', COUNT(*) FROM organizations;
SELECT 'Departments:', COUNT(*) FROM departments;
SELECT 'Users:', COUNT(*) FROM users;
SELECT 'Applications:', COUNT(*) FROM applications;
SELECT 'Roles:', COUNT(*) FROM roles;
SELECT 'User Access:', COUNT(*) FROM user_access;
SELECT 'SOD Rules:', COUNT(*) FROM sod_rules;
SELECT 'SOD Violations:', COUNT(*) FROM sod_violations;
SELECT 'Campaigns:', COUNT(*) FROM campaigns;