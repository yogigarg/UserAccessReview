import { useState, useEffect } from 'react'
import { HiExclamationCircle, HiCheckCircle, HiClock } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Modal from '../common/Modal'
import Loader from '../common/Loader'
import toast from 'react-hot-toast'

const SODViolations = () => {
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedViolation, setSelectedViolation] = useState(null)
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    severity: '',
    isResolved: '',
  })

  // Resolution form state
  const [resolutionData, setResolutionData] = useState({
    resolutionAction: '',
    resolutionNotes: '',
    exceptionExpiry: '',
  })

  const resolutionActions = [
    { value: 'revoked', label: 'Revoke Access', icon: '❌' },
    { value: 'exception_granted', label: 'Grant Exception', icon: '⚠️' },
    { value: 'mitigating_control', label: 'Mitigating Control', icon: '🛡️' },
  ]

  useEffect(() => {
    loadViolations()
    loadStats()
  }, [filters])

  const loadViolations = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (filters.severity) queryParams.append('severity', filters.severity)
      if (filters.isResolved) queryParams.append('isResolved', filters.isResolved)

      const response = await fetch(`/api/v1/sod/violations?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      
      // Handle nested response structure
      let violationsData = []
      if (data.data && data.data.data) {
        violationsData = data.data.data
      } else if (data.data) {
        violationsData = Array.isArray(data.data) ? data.data : []
      }
      
      console.log('Violations loaded:', violationsData)
      setViolations(violationsData)
    } catch (error) {
      console.error('Load violations error:', error)
      toast.error('Failed to load violations')
      setViolations([])
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
      
      // Handle nested response structure
      let allViolations = []
      if (data.data && data.data.data) {
        allViolations = data.data.data
      } else if (data.data) {
        allViolations = Array.isArray(data.data) ? data.data : []
      }

      console.log('Violations for stats:', allViolations)

      setStats({
        total: allViolations.length,
        unresolved: allViolations.filter(v => !v.is_resolved).length,
        critical: allViolations.filter(v => v.severity === 'critical' && !v.is_resolved).length,
        resolved: allViolations.filter(v => v.is_resolved).length,
      })
    } catch (error) {
      console.error('Load stats error:', error)
      setStats({
        total: 0,
        unresolved: 0,
        critical: 0,
        resolved: 0,
      })
    }
  }

  const handleResolve = (violation, e) => {
    e.stopPropagation()
    setSelectedViolation(violation)
    setResolutionData({
      resolutionAction: '',
      resolutionNotes: '',
      exceptionExpiry: '',
    })
    setShowResolveModal(true)
  }

  const handleSubmitResolution = async (e) => {
    e.preventDefault()

    if (!resolutionData.resolutionAction) {
      toast.error('Please select a resolution action')
      return
    }

    if (resolutionData.resolutionAction === 'exception_granted' && !resolutionData.exceptionExpiry) {
      toast.error('Exception expiry date is required')
      return
    }

    try {
      const response = await fetch(`/api/v1/sod/violations/${selectedViolation.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(resolutionData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to resolve violation')
      }

      toast.success('Violation resolved successfully')
      setShowResolveModal(false)
      loadViolations()
      loadStats()
    } catch (error) {
      console.error('Resolve violation error:', error)
      toast.error(error.message || 'Failed to resolve violation')
    }
  }

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      critical: { variant: 'danger', label: 'Critical' },
      high: { variant: 'warning', label: 'High' },
      medium: { variant: 'info', label: 'Medium' },
      low: { variant: 'success', label: 'Low' },
    }
    const config = severityConfig[severity] || { variant: 'secondary', label: severity }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getDaysOpen = (detectedAt) => {
    const detected = new Date(detectedAt)
    const now = new Date()
    const days = Math.floor((now - detected) / (1000 * 60 * 60 * 24))
    return days
  }

  const columns = [
    {
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.user_name}</p>
          <p className="text-sm text-gray-600">{row.user_email}</p>
        </div>
      ),
    },
    {
      header: 'Rule',
      cell: (row) => (
        <div>
          <p className="text-gray-900">{row.rule_name}</p>
          <p className="text-sm text-gray-600">{row.process_area}</p>
        </div>
      ),
    },
    {
      header: 'Conflicting Roles',
      cell: (row) => {
        const roles = JSON.parse(row.conflicting_roles || '[]')
        return (
          <div className="space-y-1">
            {roles.slice(0, 2).map((role, idx) => (
              <div key={idx} className="text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded">
                {role}
              </div>
            ))}
            {roles.length > 2 && (
              <span className="text-xs text-gray-500">
                +{roles.length - 2} more
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: 'Severity',
      accessor: 'severity',
      cell: (row) => getSeverityBadge(row.severity),
    },
    {
      header: 'Days Open',
      cell: (row) => {
        const days = getDaysOpen(row.detected_at)
        return (
          <div className="flex items-center gap-1">
            <HiClock className={`h-4 w-4 ${days > 30 ? 'text-red-500' : 'text-gray-500'}`} />
            <span className={days > 30 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
              {days} days
            </span>
          </div>
        )
      },
    },
    {
      header: 'Status',
      cell: (row) => (
        <div>
          {row.is_resolved ? (
            <Badge variant="success">
              <HiCheckCircle className="h-4 w-4 mr-1 inline" />
              Resolved
            </Badge>
          ) : (
            <Badge variant="danger">
              <HiExclamationCircle className="h-4 w-4 mr-1 inline" />
              Open
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          {!row.is_resolved ? (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => handleResolve(row, e)}
            >
              Resolve
            </Button>
          ) : (
            <span className="text-xs text-gray-600 capitalize">
              {row.resolution_action?.replace('_', ' ')}
            </span>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SOD Violations</h1>
            <p className="text-gray-600">
              Monitor and resolve segregation of duties conflicts
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SOD Violations</h1>
          <p className="text-gray-600">
            Monitor and resolve segregation of duties conflicts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Violations</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Unresolved</p>
            <p className="text-3xl font-bold text-orange-600">{stats.unresolved}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Critical</p>
            <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Resolved</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.isResolved}
              onChange={(e) => setFilters({ ...filters, isResolved: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => setFilters({ severity: '', isResolved: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Violations Table */}
      <Table
        columns={columns}
        data={violations}
        loading={loading}
        emptyMessage="No violations found"
      />

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve SOD Violation"
      >
        {selectedViolation && (
          <form onSubmit={handleSubmitResolution} className="space-y-6">
            {/* Violation Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Violation Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">User:</span>
                  <span className="text-gray-900 font-medium">{selectedViolation.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rule:</span>
                  <span className="text-gray-900 font-medium">{selectedViolation.rule_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Severity:</span>
                  {getSeverityBadge(selectedViolation.severity)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Open:</span>
                  <span className="text-gray-900 font-medium">
                    {getDaysOpen(selectedViolation.detected_at)} days
                  </span>
                </div>
              </div>
            </div>

            {/* Resolution Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Resolution Action *
              </label>
              <div className="grid grid-cols-1 gap-3">
                {resolutionActions.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => setResolutionData({ ...resolutionData, resolutionAction: action.value })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      resolutionData.resolutionAction === action.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{action.icon}</span>
                      <div>
                        <p className="text-gray-900 font-medium">{action.label}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Exception Expiry (only for exception_granted) */}
            {resolutionData.resolutionAction === 'exception_granted' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exception Expiry Date *
                </label>
                <input
                  type="date"
                  value={resolutionData.exceptionExpiry}
                  onChange={(e) => setResolutionData({ ...resolutionData, exceptionExpiry: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Maximum 90 days from today
                </p>
              </div>
            )}

            {/* Resolution Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes *
              </label>
              <textarea
                value={resolutionData.resolutionNotes}
                onChange={(e) => setResolutionData({ ...resolutionData, resolutionNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Provide detailed justification for this resolution..."
                required
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Submit Resolution
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default SODViolations
