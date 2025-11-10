import { useState, useEffect } from 'react'
import { HiPlus, HiPencil, HiTrash, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Modal from '../common/Modal'
import Loader from '../common/Loader'
import toast from 'react-hot-toast'

const SODRules = () => {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [stats, setStats] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'high',
    processArea: '',
    conflictingRoles: [],
    applicationIds: [],
    autoRemediate: false,
    requiresExceptionApproval: true,
  })

  const severityOptions = [
    { value: 'critical', label: 'Critical', color: 'danger' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'medium', label: 'Medium', color: 'info' },
    { value: 'low', label: 'Low', color: 'success' },
  ]

  const processAreas = [
    'Order-to-Cash (O2C)',
    'Procure-to-Pay (P2P)',
    'Record-to-Report (R2R)',
    'Hire-to-Retire (H2R)',
    'IT General Controls (ITGC)',
    'Custom',
  ]

  useEffect(() => {
    loadRules()
    loadStats()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/sod/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      // Handle nested response structure
      let rulesData = []
      if (data.data && data.data.data) {
        rulesData = data.data.data
      } else if (data.data) {
        rulesData = Array.isArray(data.data) ? data.data : []
      }
      
      console.log('Rules loaded:', rulesData)
      setRules(rulesData)
    } catch (error) {
      console.error('Load rules error:', error)
      toast.error('Failed to load SOD rules')
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/sod/violations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      let violationsData = []
      if (data.data && data.data.data) {
        violationsData = data.data.data
      } else if (data.data) {
        violationsData = Array.isArray(data.data) ? data.data : []
      }
      
      setStats({
        totalRules: rules.length,
        activeRules: rules.filter(r => r.is_active).length,
        totalViolations: violationsData.length,
        criticalViolations: violationsData.filter(v => v.severity === 'critical' && !v.is_resolved).length,
      })
    } catch (error) {
      console.error('Load stats error:', error)
      setStats({
        totalRules: rules.length,
        activeRules: rules.filter(r => r.is_active).length,
        totalViolations: 0,
        criticalViolations: 0,
      })
    }
  }

  const handleCreate = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      description: '',
      severity: 'high',
      processArea: '',
      conflictingRoles: [],
      applicationIds: [],
      autoRemediate: false,
      requiresExceptionApproval: true,
    })
    setShowModal(true)
  }

  const handleEdit = (rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      processArea: rule.process_area,
      conflictingRoles: JSON.parse(rule.conflicting_roles || '[]'),
      applicationIds: rule.application_ids || [],
      autoRemediate: rule.auto_remediate,
      requiresExceptionApproval: rule.requires_exception_approval,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingRule 
        ? `/api/v1/sod/rules/${editingRule.id}`
        : '/api/v1/sod/rules'
      
      const method = editingRule ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save rule')
      }

      toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully')
      setShowModal(false)
      loadRules()
      loadStats()
    } catch (error) {
      console.error('Save rule error:', error)
      toast.error(error.message || 'Failed to save rule')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/v1/sod/rules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete rule')
      }

      toast.success('Rule deleted successfully')
      loadRules()
      loadStats()
    } catch (error) {
      console.error('Delete rule error:', error)
      toast.error(error.message || 'Failed to delete rule')
    }
  }

  const getSeverityBadge = (severity) => {
    const config = severityOptions.find(s => s.value === severity)
    return (
      <Badge variant={config?.color || 'info'}>
        {config?.label || severity}
      </Badge>
    )
  }

  const columns = [
    {
      header: 'Rule Name',
      accessor: 'name',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-600">{row.description}</p>
        </div>
      ),
    },
    {
      header: 'Process Area',
      accessor: 'process_area',
      cell: (row) => (
        <span className="text-gray-900">{row.process_area}</span>
      ),
    },
    {
      header: 'Severity',
      accessor: 'severity',
      cell: (row) => getSeverityBadge(row.severity),
    },
    {
      header: 'Active Violations',
      accessor: 'active_violation_count',
      cell: (row) => (
        <div className="flex items-center gap-1">
          {row.active_violation_count > 0 ? (
            <>
              <HiExclamationCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-600 font-semibold">{row.active_violation_count}</span>
            </>
          ) : (
            <>
              <HiCheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-600">0</span>
            </>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'is_active',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(row)
            }}
          >
            <HiPencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(row.id)
            }}
          >
            <HiTrash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Segregation of Duties Rules
            </h1>
            <p className="text-gray-600">
              Define and manage SOD rules to prevent toxic role combinations
            </p>
          </div>
        </div>
        <Card>
          <Loader />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Segregation of Duties Rules
          </h1>
          <p className="text-gray-600">
            Define and manage SOD rules to prevent toxic role combinations
          </p>
        </div>
        <Button variant="primary" icon={HiPlus} onClick={handleCreate}>
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Rules</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRules}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Active Rules</p>
            <p className="text-3xl font-bold text-blue-600">{stats.activeRules}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Violations</p>
            <p className="text-3xl font-bold text-orange-600">{stats.totalViolations}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Critical Violations</p>
            <p className="text-3xl font-bold text-red-600">{stats.criticalViolations}</p>
          </Card>
        </div>
      )}

      {/* Rules Table */}
      <Table
        columns={columns}
        data={rules}
        loading={loading}
        emptyMessage="No SOD rules found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? 'Edit SOD Rule' : 'Create SOD Rule'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Create Purchase Order + Approve Payment"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Describe why this combination is toxic..."
            />
          </div>

          {/* Process Area & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Process Area *
              </label>
              <select
                value={formData.processArea}
                onChange={(e) => setFormData({ ...formData, processArea: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select process area</option>
                {processAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {severityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflicting Roles */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conflicting Roles
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Define which roles cannot be held by the same user
            </p>
            <textarea
              value={formData.conflictingRoles.join('\n')}
              onChange={(e) => setFormData({ 
                ...formData, 
                conflictingRoles: e.target.value.split('\n').filter(r => r.trim()) 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter one role per line, e.g.:&#10;Purchase_Order_Creator&#10;Payment_Approver"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.autoRemediate}
                onChange={(e) => setFormData({ ...formData, autoRemediate: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Auto-remediate violations (automatically revoke conflicting access)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requiresExceptionApproval}
                onChange={(e) => setFormData({ ...formData, requiresExceptionApproval: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Require exception approval for violations
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SODRules
