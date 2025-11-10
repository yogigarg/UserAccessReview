import { useState, useEffect } from 'react'
import { HiDownload, HiFilter } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const AuditLogReport = () => {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    entityType: '',
    limit: 100,
  })

  const actionTypes = ['create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject']
  const entityTypes = ['user', 'campaign', 'review_item', 'role', 'application', 'sod_rule', 'sod_violation']

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.action) queryParams.append('action', filters.action)
      if (filters.entityType) queryParams.append('entityType', filters.entityType)
      queryParams.append('limit', filters.limit)

      const response = await fetch(`/api/v1/reports/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setLogs(Array.isArray(data.data) ? data.data : [])
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Load report error:', error)
      toast.error('Failed to load audit log report')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterApply = () => {
    loadReport()
  }

  const getActionBadge = (action) => {
    const actionConfig = {
      create: { variant: 'success', label: 'Create' },
      update: { variant: 'info', label: 'Update' },
      delete: { variant: 'danger', label: 'Delete' },
      login: { variant: 'secondary', label: 'Login' },
      logout: { variant: 'secondary', label: 'Logout' },
      export: { variant: 'warning', label: 'Export' },
      approve: { variant: 'success', label: 'Approve' },
      reject: { variant: 'danger', label: 'Reject' },
    }
    const config = actionConfig[action] || { variant: 'secondary', label: action }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      cell: (row) => (
        <div>
          <p className="text-gray-900 text-sm">{formatDate(row.created_at)}</p>
          <p className="text-xs text-gray-600">
            {new Date(row.created_at).toLocaleTimeString()}
          </p>
        </div>
      ),
    },
    {
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.user_name || 'System'}</p>
          <p className="text-sm text-gray-600">{row.user_email || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      cell: (row) => getActionBadge(row.action),
    },
    {
      header: 'Entity',
      cell: (row) => (
        <div>
          <p className="text-gray-900 capitalize">{row.entity_type?.replace('_', ' ')}</p>
          {row.entity_name && (
            <p className="text-sm text-gray-600">{row.entity_name}</p>
          )}
        </div>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      cell: (row) => (
        <span className="text-gray-900 text-sm font-mono">{row.ip_address || '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'success',
      cell: (row) => (
        <Badge variant={row.success ? 'success' : 'danger'}>
          {row.success ? 'Success' : 'Failed'}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Audit Log Report
            </h1>
            <p className="text-gray-600">System activity and change history</p>
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
            Audit Log Report
          </h1>
          <p className="text-gray-600">System activity and change history</p>
        </div>
        <Button variant="primary" icon={HiDownload} disabled>
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action} className="capitalize">
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {entityTypes.map(type => (
                <option key={type} value={type} className="capitalize">
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={handleFilterApply}
              className="flex-1"
              icon={HiFilter}
            >
              Apply
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  action: '',
                  entityType: '',
                  limit: 100,
                })
                setTimeout(loadReport, 100)
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Events</p>
          <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">Successful</p>
          <p className="text-3xl font-bold text-green-600">
            {logs.filter(l => l.success).length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">Failed</p>
          <p className="text-3xl font-bold text-red-600">
            {logs.filter(l => !l.success).length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">Unique Users</p>
          <p className="text-3xl font-bold text-blue-600">
            {new Set(logs.map(l => l.user_id).filter(Boolean)).size}
          </p>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Table
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs found"
      />
    </div>
  )
}

export default AuditLogReport
