const { query } = require('../config/database');
const { successResponse, errorResponse, getPaginationParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get organizational hierarchy
const getOrgHierarchy = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    const hierarchyQuery = `
      WITH RECURSIVE org_tree AS (
        -- Base case: top-level employees (no manager or manager outside org)
        SELECT 
          u.id,
          u.employee_id,
          u.first_name,
          u.last_name,
          u.email,
          u.job_title,
          u.role,
          d.name as department_name,
          mem.manager_id,
          0 as level,
          ARRAY[u.id] as path
        FROM users u
        LEFT JOIN manager_employee_mapping mem ON mem.employee_id = u.id 
          AND mem.is_primary = true 
          AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.organization_id = $1
          AND u.status = 'active'
          AND (mem.manager_id IS NULL OR mem.manager_id NOT IN (
            SELECT id FROM users WHERE organization_id = $1
          ))
        
        UNION ALL
        
        -- Recursive case: employees reporting to someone in the tree
        SELECT 
          u.id,
          u.employee_id,
          u.first_name,
          u.last_name,
          u.email,
          u.job_title,
          u.role,
          d.name as department_name,
          mem.manager_id,
          ot.level + 1,
          ot.path || u.id
        FROM users u
        JOIN manager_employee_mapping mem ON mem.employee_id = u.id 
          AND mem.is_primary = true
          AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
        JOIN org_tree ot ON ot.id = mem.manager_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.organization_id = $1
          AND u.status = 'active'
          AND NOT (u.id = ANY(ot.path))
      )
      SELECT 
        ot.*,
        COUNT(DISTINCT mem.employee_id) as direct_reports_count
      FROM org_tree ot
      LEFT JOIN manager_employee_mapping mem ON mem.manager_id = ot.id
        AND mem.is_primary = true
        AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
      GROUP BY ot.id, ot.employee_id, ot.first_name, ot.last_name, ot.email, 
               ot.job_title, ot.role, ot.department_name, ot.manager_id, ot.level, ot.path
      ORDER BY ot.level, ot.last_name, ot.first_name
    `;

    const result = await query(hierarchyQuery, [organizationId]);

    return successResponse(res, result.rows, 'Organizational hierarchy retrieved successfully');
  } catch (error) {
    logger.error('Get org hierarchy error:', error);
    return errorResponse(res, 'Failed to get organizational hierarchy', 500);
  }
};

// Get org chart (formatted for tree visualization)
const getOrgChart = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    const mappingsQuery = `
      SELECT 
        mem.employee_id,
        mem.manager_id,
        u.employee_id as emp_code,
        u.first_name || ' ' || u.last_name as employee_name,
        u.job_title,
        u.email,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name,
        COUNT(DISTINCT reports.employee_id) as direct_reports
      FROM manager_employee_mapping mem
      JOIN users u ON u.id = mem.employee_id
      LEFT JOIN users m ON m.id = mem.manager_id
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN manager_employee_mapping reports ON reports.manager_id = mem.employee_id
        AND reports.is_primary = true
        AND (reports.effective_to IS NULL OR reports.effective_to >= CURRENT_DATE)
      WHERE u.organization_id = $1
        AND u.status = 'active'
        AND mem.is_primary = true
        AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
      GROUP BY mem.employee_id, mem.manager_id, u.employee_id, u.first_name, 
               u.last_name, u.job_title, u.email, d.name, m.first_name, m.last_name
    `;

    const result = await query(mappingsQuery, [organizationId]);

    const buildTree = (employees, managerId = null) => {
      return employees
        .filter(emp => emp.manager_id === managerId)
        .map(emp => ({
          id: emp.employee_id,
          name: emp.employee_name,
          title: emp.job_title,
          email: emp.email,
          department: emp.department_name,
          directReports: emp.direct_reports,
          children: buildTree(employees, emp.employee_id)
        }));
    };

    const orgChart = buildTree(result.rows);

    return successResponse(res, orgChart, 'Org chart retrieved successfully');
  } catch (error) {
    logger.error('Get org chart error:', error);
    return errorResponse(res, 'Failed to get org chart', 500);
  }
};

// Get employees for a specific manager
const getManagerEmployees = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);
    const organizationId = req.user.organization_id || req.user.organizationId;

    const employeesQuery = `
      SELECT 
        u.id,
        u.employee_id,
        u.first_name,
        u.last_name,
        u.email,
        u.job_title,
        u.status,
        d.name as department_name,
        mem.reporting_type,
        mem.effective_from,
        mem.effective_to,
        COUNT(DISTINCT ua.id) as access_count
      FROM manager_employee_mapping mem
      JOIN users u ON u.id = mem.employee_id
      LEFT JOIN departments d ON d.id = mem.department_id
      LEFT JOIN user_access ua ON ua.user_id = u.id AND ua.is_active = true
      WHERE mem.manager_id = $1::uuid
        AND u.organization_id = $2
        AND mem.is_primary = true
        AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
      GROUP BY u.id, d.name, mem.reporting_type, mem.effective_from, mem.effective_to
      ORDER BY u.last_name, u.first_name
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT mem.employee_id)
      FROM manager_employee_mapping mem
      JOIN users u ON u.id = mem.employee_id
      WHERE mem.manager_id = $1::uuid
        AND u.organization_id = $2
        AND mem.is_primary = true
        AND (mem.effective_to IS NULL OR mem.effective_to >= CURRENT_DATE)
    `;

    const [employees, countResult] = await Promise.all([
      query(employeesQuery, [managerId, organizationId, limit, offset]),
      query(countQuery, [managerId, organizationId])
    ]);

    return successResponse(res, employees.rows, 'Manager employees retrieved successfully', 200, {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    logger.error('Get manager employees error:', error);
    return errorResponse(res, 'Failed to get manager employees', 500);
  }
};

// Create manager-employee mapping
const createMapping = async (req, res) => {
  try {
    const {
      employee_id,
      manager_id,
      department_id,
      effective_from,
      effective_to,
      is_primary = true,
      reporting_type = 'direct',
      source_system
    } = req.body;

    const organizationId = req.user.organization_id || req.user.organizationId;

    // Validate employee and manager exist
    const usersCheck = await query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND organization_id = $2',
      [[employee_id, manager_id], organizationId]
    );

    if (usersCheck.rows.length !== 2) {
      return errorResponse(res, 'Employee or manager not found', 404);
    }

    // Prevent self-reporting
    if (employee_id === manager_id) {
      return errorResponse(res, 'Employee cannot report to themselves', 400);
    }

    // Check for existing primary mapping if this is primary
    if (is_primary) {
      const existingPrimary = await query(
        `SELECT id FROM manager_employee_mapping 
         WHERE employee_id = $1::uuid
         AND is_primary = true 
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
        [employee_id]
      );

      if (existingPrimary.rows.length > 0) {
        return errorResponse(res, 'Employee already has a primary manager', 400);
      }
    }

    const result = await query(
      `INSERT INTO manager_employee_mapping (
        employee_id, manager_id, department_id, effective_from, effective_to,
        is_primary, reporting_type, source_system
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)
      RETURNING *`,
      [employee_id, manager_id, department_id, effective_from, effective_to, 
       is_primary, reporting_type, source_system]
    );

    // Update user's manager_id field
    if (is_primary) {
      await query(
        'UPDATE users SET manager_id = $1::uuid WHERE id = $2::uuid',
        [manager_id, employee_id]
      );
    }

    logger.info('Manager-employee mapping created:', {
      mappingId: result.rows[0].id,
      createdBy: req.user.email
    });

    return successResponse(res, result.rows[0], 'Mapping created successfully', 201);
  } catch (error) {
    logger.error('Create mapping error:', error);
    return errorResponse(res, 'Failed to create mapping', 500);
  }
};

// Update manager-employee mapping
const updateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      manager_id,
      department_id,
      effective_from,
      effective_to,
      is_primary,
      reporting_type
    } = req.body;

    const result = await query(
      `UPDATE manager_employee_mapping
       SET manager_id = COALESCE($1::uuid, manager_id),
           department_id = COALESCE($2::uuid, department_id),
           effective_from = COALESCE($3, effective_from),
           effective_to = $4,
           is_primary = COALESCE($5, is_primary),
           reporting_type = COALESCE($6, reporting_type),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7::uuid
       RETURNING *`,
      [manager_id, department_id, effective_from, effective_to, is_primary, reporting_type, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Mapping not found', 404);
    }

    return successResponse(res, result.rows[0], 'Mapping updated successfully');
  } catch (error) {
    logger.error('Update mapping error:', error);
    return errorResponse(res, 'Failed to update mapping', 500);
  }
};

// Delete mapping
const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM manager_employee_mapping WHERE id = $1::uuid RETURNING employee_id',
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Mapping not found', 404);
    }

    return successResponse(res, null, 'Mapping deleted successfully');
  } catch (error) {
    logger.error('Delete mapping error:', error);
    return errorResponse(res, 'Failed to delete mapping', 500);
  }
};

// Get delegates
const getDelegates = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { active_only = 'true' } = req.query;

    let whereClause = 'WHERE u.organization_id = $1';
    if (active_only === 'true') {
      whereClause += ` AND md.is_active = true 
        AND md.delegation_start <= CURRENT_DATE 
        AND md.delegation_end >= CURRENT_DATE`;
    }

    const delegatesQuery = `
      SELECT 
        md.*,
        m.first_name || ' ' || m.last_name as manager_name,
        m.email as manager_email,
        du.first_name || ' ' || du.last_name as delegate_name,
        du.email as delegate_email,
        d.name as department_name
      FROM manager_delegates md
      JOIN users m ON m.id = md.manager_id
      JOIN users du ON du.id = md.delegate_user_id
      JOIN users u ON u.id = md.manager_id
      LEFT JOIN departments d ON d.id = md.department_id
      ${whereClause}
      ORDER BY md.delegation_start DESC
    `;

    const result = await query(delegatesQuery, [organizationId]);

    return successResponse(res, result.rows, 'Delegates retrieved successfully');
  } catch (error) {
    logger.error('Get delegates error:', error);
    return errorResponse(res, 'Failed to get delegates', 500);
  }
};

// Create delegate
const createDelegate = async (req, res) => {
  try {
    const {
      manager_id,
      delegate_user_id,
      department_id,
      delegation_start,
      delegation_end,
      delegation_reason
    } = req.body;

    const organizationId = req.user.organization_id || req.user.organizationId;

    // Validate dates
    if (new Date(delegation_end) < new Date(delegation_start)) {
      return errorResponse(res, 'End date must be after start date', 400);
    }

    // Validate users exist
    const usersCheck = await query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND organization_id = $2',
      [[manager_id, delegate_user_id], organizationId]
    );

    if (usersCheck.rows.length !== 2) {
      return errorResponse(res, 'Manager or delegate user not found', 404);
    }

    const result = await query(
      `INSERT INTO manager_delegates (
        manager_id, delegate_user_id, department_id, delegation_start,
        delegation_end, delegation_reason, created_by
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid)
      RETURNING *`,
      [manager_id, delegate_user_id, department_id, delegation_start,
       delegation_end, delegation_reason, req.user.id]
    );

    logger.info('Manager delegate created:', {
      delegateId: result.rows[0].id,
      createdBy: req.user.email
    });

    return successResponse(res, result.rows[0], 'Delegate created successfully', 201);
  } catch (error) {
    logger.error('Create delegate error:', error);
    return errorResponse(res, 'Failed to create delegate', 500);
  }
};

// Update delegate
const updateDelegate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delegation_start,
      delegation_end,
      delegation_reason,
      is_active
    } = req.body;

    const result = await query(
      `UPDATE manager_delegates
       SET delegation_start = COALESCE($1, delegation_start),
           delegation_end = COALESCE($2, delegation_end),
           delegation_reason = COALESCE($3, delegation_reason),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5::uuid
       RETURNING *`,
      [delegation_start, delegation_end, delegation_reason, is_active, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Delegate not found', 404);
    }

    return successResponse(res, result.rows[0], 'Delegate updated successfully');
  } catch (error) {
    logger.error('Update delegate error:', error);
    return errorResponse(res, 'Failed to update delegate', 500);
  }
};

// Delete delegate
const deleteDelegate = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM manager_delegates WHERE id = $1::uuid RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Delegate not found', 404);
    }

    return successResponse(res, null, 'Delegate deleted successfully');
  } catch (error) {
    logger.error('Delete delegate error:', error);
    return errorResponse(res, 'Failed to delete delegate', 500);
  }
};

// Sync from HRMS
const syncFromHRMS = async (req, res) => {
  try {
    const { hrms_type, mappings } = req.body;
    const organizationId = req.user.organization_id || req.user.organizationId;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return errorResponse(res, 'Mappings array required', 400);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const mapping of mappings) {
      try {
        const { employee_id, manager_id, department_name, effective_from } = mapping;

        // Find or create department
        let departmentId = null;
        if (department_name) {
          const dept = await query(
            'SELECT id FROM departments WHERE name = $1 AND organization_id = $2',
            [department_name, organizationId]
          );
          
          if (dept.rows.length > 0) {
            departmentId = dept.rows[0].id;
          } else {
            const newDept = await query(
              'INSERT INTO departments (organization_id, name) VALUES ($1, $2) RETURNING id',
              [organizationId, department_name]
            );
            departmentId = newDept.rows[0].id;
          }
        }

        // Check if mapping already exists
        const existing = await query(
          `SELECT id FROM manager_employee_mapping 
           WHERE employee_id = $1::uuid
           AND is_primary = true 
           AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
          [employee_id]
        );

        if (existing.rows.length > 0) {
          // Update existing mapping
          await query(
            `UPDATE manager_employee_mapping 
             SET manager_id = $1::uuid, 
                 department_id = $2::uuid, 
                 source_system = $3, 
                 last_sync_date = CURRENT_TIMESTAMP
             WHERE id = $4::uuid`,
            [manager_id, departmentId, hrms_type, existing.rows[0].id]
          );
        } else {
          // Create new mapping
          await query(
            `INSERT INTO manager_employee_mapping (
              employee_id, manager_id, department_id, effective_from,
              is_primary, source_system, last_sync_date
            ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, true, $5, CURRENT_TIMESTAMP)`,
            [employee_id, manager_id, departmentId, effective_from || new Date(), hrms_type]
          );
        }

        // Update user's manager_id
        await query(
          'UPDATE users SET manager_id = $1::uuid, department_id = $2::uuid WHERE id = $3::uuid',
          [manager_id, departmentId, employee_id]
        );

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          employee_id: mapping.employee_id,
          error: error.message
        });
      }
    }

    logger.info('HRMS sync completed:', {
      hrms_type,
      successCount,
      errorCount,
      syncedBy: req.user.email
    });

    return successResponse(res, {
      success_count: successCount,
      error_count: errorCount,
      errors: errors.length > 0 ? errors : undefined
    }, 'HRMS sync completed');
  } catch (error) {
    logger.error('HRMS sync error:', error);
    return errorResponse(res, 'Failed to sync from HRMS', 500);
  }
};

// Get sync status
const getSyncStatus = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    const statusQuery = `
      SELECT 
        source_system,
        COUNT(*) as total_mappings,
        MAX(last_sync_date) as last_sync,
        COUNT(CASE WHEN last_sync_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_syncs
      FROM manager_employee_mapping mem
      JOIN users u ON u.id = mem.employee_id
      WHERE u.organization_id = $1
        AND source_system IS NOT NULL
      GROUP BY source_system
    `;

    const result = await query(statusQuery, [organizationId]);

    return successResponse(res, result.rows, 'Sync status retrieved successfully');
  } catch (error) {
    logger.error('Get sync status error:', error);
    return errorResponse(res, 'Failed to get sync status', 500);
  }
};

// Get departments
const getDepartments = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    const deptQuery = `
      SELECT 
        d.*,
        m.first_name || ' ' || m.last_name as manager_name,
        pd.name as parent_department_name,
        COUNT(DISTINCT u.id) as employee_count
      FROM departments d
      LEFT JOIN users m ON m.id = d.manager_id
      LEFT JOIN departments pd ON pd.id = d.parent_department_id
      LEFT JOIN users u ON u.department_id = d.id AND u.status = 'active'
      WHERE d.organization_id = $1
      GROUP BY d.id, m.first_name, m.last_name, pd.name
      ORDER BY d.name
    `;

    const result = await query(deptQuery, [organizationId]);

    return successResponse(res, result.rows, 'Departments retrieved successfully');
  } catch (error) {
    logger.error('Get departments error:', error);
    return errorResponse(res, 'Failed to get departments', 500);
  }
};

// Create department
const createDepartment = async (req, res) => {
  try {
    const {
      name,
      code,
      parent_department_id,
      manager_id,
      description,
      cost_center,
      location
    } = req.body;

    const organizationId = req.user.organization_id || req.user.organizationId;

    const result = await query(
      `INSERT INTO departments (
        organization_id, name, code, parent_department_id, manager_id,
        description, cost_center, location
      ) VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $6, $7, $8)
      RETURNING *`,
      [organizationId, name, code, parent_department_id, manager_id,
       description, cost_center, location]
    );

    return successResponse(res, result.rows[0], 'Department created successfully', 201);
  } catch (error) {
    logger.error('Create department error:', error);
    return errorResponse(res, 'Failed to create department', 500);
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      parent_department_id,
      manager_id,
      description,
      cost_center,
      location
    } = req.body;

    const result = await query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           parent_department_id = $3::uuid,
           manager_id = $4::uuid,
           description = COALESCE($5, description),
           cost_center = COALESCE($6, cost_center),
           location = COALESCE($7, location),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8::uuid
       RETURNING *`,
      [name, code, parent_department_id, manager_id, description, cost_center, location, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Department not found', 404);
    }

    return successResponse(res, result.rows[0], 'Department updated successfully');
  } catch (error) {
    logger.error('Update department error:', error);
    return errorResponse(res, 'Failed to update department', 500);
  }
};

module.exports = {
  getOrgHierarchy,
  getOrgChart,
  getManagerEmployees,
  createMapping,
  updateMapping,
  deleteMapping,
  getDelegates,
  createDelegate,
  updateDelegate,
  deleteDelegate,
  syncFromHRMS,
  getSyncStatus,
  getDepartments,
  createDepartment,
  updateDepartment,
};