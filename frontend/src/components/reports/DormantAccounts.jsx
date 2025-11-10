import { useState, useEffect } from 'react'
import { HiDownload, HiClock } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const DormantAccounts = () => {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [daysInactive, setDaysInactive] = useState(90)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/reports/dormant-accounts?daysInactive=${daysInactive}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setAccounts(Array.isArray(data.data) ? data.data : [])
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Load report error:', error)
      toast.error('Failed to load dormant accounts report')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterApply = () => {
    loadReport()
  }

  const getDaysInactive = (lastLoginDate) => {
    if (!lastLoginDate) return 'Never'
    const lastLogin = new Date(lastLoginDate)
    const now = new Date()
    const days = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24))
    return `${days} days`
  }

  const getRiskBadge = (days) => {
    if (!days || days === 'Never') return <Badge variant="danger">High Risk</Badge>
    const numDays = parseInt(days)
    if (numDays > 180) return <Badge variant="danger">High Risk</Badge>
    if (numDays > 90) return <Badge variant="warning">Medium Risk</Badge>
    return <Badge variant="info">Low Risk</Badge>
  }

  const columns = [
    {
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-sm text-gray-600">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Employee ID',
      accessor: 'employee_id',
      cell: (row) => (
        <span className="text-gray-900">{row.employee_id}</span>
      ),
    },
    {
      header: 'Department',
      accessor: 'department_name',
      cell: (row) => (
        <span className="text-gray-900">{row.department_name || '-'}</span>
      ),
    },
    {
      header: 'Last Login',
      accessor: 'last_login_at',
      cell: (row) => (
        <div>
          <p className="text-gray-900 text-sm">
            {row.last_login_at ? formatDate(row.last_login_at) : 'Never'}
          </p>
          <p className="text-xs text-gray-600">
            {getDaysInactive(row.last_login_at)} ago
          </p>
        </div>
      ),
    },
    {
      header: 'Active Access',
      cell: (row) => (
        <span className="text-gray-900 font-medium">
          {row.active_access_count || 0}
        </span>
      ),
    },
    {
      header: 'Risk Level',
      cell: (row) => getRiskBadge(getDaysInactive(row.last_login_at)),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
          {row.status}
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
              Dormant Accounts Report
            </h1>
            <p className="text-gray-600">Inactive user accounts requiring review</p>
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
            Dormant Accounts Report
          </h1>
          <p className="text-gray-600">Inactive user accounts requiring review</p>
        </div>
        <Button variant="primary" icon={HiDownload} disabled>
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Inactive Threshold
            </label>
            <select
              value={daysInactive}
              onChange={(e) => setDaysInactive(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="120">120 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={handleFilterApply}
              className="flex-1"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Dormant</p>
          <p className="text-3xl font-bold text-gray-900">{accounts.length}</p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">High Risk</p>
          <p className="text-3xl font-bold text-red-600">
            {accounts.filter(a => {
              const days = getDaysInactive(a.last_login_at)
              return days === 'Never' || parseInt(days) > 180
            }).length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">Medium Risk</p>
          <p className="text-3xl font-bold text-orange-600">
            {accounts.filter(a => {
              const days = getDaysInactive(a.last_login_at)
              if (days === 'Never') return false
              const numDays = parseInt(days)
              return numDays > 90 && numDays <= 180
            }).length}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Access Rights</p>
          <p className="text-3xl font-bold text-blue-600">
            {accounts.reduce((sum, a) => sum + (a.active_access_count || 0), 0)}
          </p>
        </Card>
      </div>

      {/* Dormant Accounts Table */}
      <Table
        columns={columns}
        data={accounts}
        loading={loading}
        emptyMessage="No dormant accounts found"
      />

      {accounts.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <HiClock className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Dormant Accounts</h3>
            <p className="mt-1 text-gray-500">
              All users have logged in within the last {daysInactive} days
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DormantAccounts
