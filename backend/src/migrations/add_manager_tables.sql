-- Add organization_id to departments if not exists
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS manager_delegates CASCADE;
DROP TABLE IF EXISTS manager_employee_mapping CASCADE;

-- Manager-Employee Mapping table
CREATE TABLE manager_employee_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_primary BOOLEAN DEFAULT true,
    reporting_type VARCHAR(50) DEFAULT 'direct',
    source_system VARCHAR(100),
    last_sync_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reporting_type CHECK (reporting_type IN ('direct', 'dotted_line', 'functional')),
    CONSTRAINT chk_not_self_manager CHECK (employee_id != manager_id),
    CONSTRAINT chk_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Manager Delegates table
CREATE TABLE manager_delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delegate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    delegation_start DATE NOT NULL,
    delegation_end DATE NOT NULL,
    delegation_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_delegation_dates CHECK (delegation_end >= delegation_start),
    CONSTRAINT chk_not_self_delegate CHECK (manager_id != delegate_user_id)
);

-- Indexes for performance
CREATE INDEX idx_mem_employee ON manager_employee_mapping(employee_id);
CREATE INDEX idx_mem_manager ON manager_employee_mapping(manager_id);
CREATE INDEX idx_mem_primary ON manager_employee_mapping(is_primary) WHERE is_primary = true;
CREATE INDEX idx_mem_effective ON manager_employee_mapping(effective_from, effective_to);
CREATE INDEX idx_delegates_manager ON manager_delegates(manager_id);
CREATE INDEX idx_delegates_active ON manager_delegates(is_active) WHERE is_active = true;

-- Add some comments for documentation
COMMENT ON TABLE manager_employee_mapping IS 'Stores reporting relationships between employees and managers';
COMMENT ON TABLE manager_delegates IS 'Stores temporary delegation assignments for managers';
COMMENT ON COLUMN manager_employee_mapping.is_primary IS 'Indicates if this is the primary reporting relationship';
COMMENT ON COLUMN manager_employee_mapping.reporting_type IS 'Type of reporting: direct, dotted_line, or functional';
COMMENT ON COLUMN manager_employee_mapping.source_system IS 'Source HRMS system (e.g., Workday, Oracle HCM, SAP SF)';