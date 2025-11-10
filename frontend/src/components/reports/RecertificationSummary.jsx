import { useState, useEffect } from 'react'
import { HiDownload, HiCalendar } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { getStatusColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const RecertificationSummary = () => {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)

      const response = await fetch(`/api/v1/reports/recertification-summary?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setReportData(data.data)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Load report error:', error)
      toast.error('Failed to load recertification summary')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterApply = () => {
    loadReport()
  }

  const columns = [
    {
      header: 'Campaign Name',
      accessor: 'name',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-600 capitalize">{row.campaign_type?.replace('_', ' ')}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <Badge variant={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Period',
      cell: (row) => (
        <div>
          <p className="text-gray-900 text-sm">{formatDate(row.start_date)}</p>
          <p className="text-gray-600 text-sm">to {formatDate(row.end_date)}</p>
        </div>
      ),
    },
    {
      header: 'Completion',
      accessor: 'completion_percentage',
      cell: (row) => {
        const percentage = parseFloat(row.completion_percentage) || 0
        return (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Reviews',
      cell: (row) => (
        <span className="text-gray-900">
          {row.completed_reviews}/{row.total_reviews}
        </span>
      ),
    },
    {
      header: 'Approved',
      accessor: 'approved_count',
      cell: (row) => (
        <span className="text-green-600 font-medium">{row.approved_count || 0}</span>
      ),
    },
    {
      header: 'Revoked',
      accessor: 'revoked_count',
      cell: (row) => (
        <span className="text-red-600 font-medium">{row.revoked_count || 0}</span>
      ),
    },
    {
      header: 'Exceptions',
      accessor: 'exception_count',
      cell: (row) => (
        <span className="text-orange-600 font-medium">{row.exception_count || 0}</span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Recertification Summary
            </h1>
            <p className="text-gray-600">Overview of access recertification campaigns</p>
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
            Recertification Summary
          </h1>
          <p className="text-gray-600">Overview of access recertification campaigns</p>
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

          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={handleFilterApply}
              className="flex-1"
            >
              Apply Filters
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({ startDate: '', endDate: '' })
                setTimeout(loadReport, 100)
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      {reportData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
            <p className="text-3xl font-bold text-gray-900">
              {reportData.summary.total_campaigns || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {reportData.summary.completed_campaigns || 0} completed
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
            <p className="text-3xl font-bold text-blue-600">
              {reportData.summary.total_reviews || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {reportData.summary.completed_reviews || 0} completed
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600 mb-1">Avg Completion</p>
            <p className="text-3xl font-bold text-green-600">
              {reportData.summary.avg_completion_rate || 0}%
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Revoked</p>
            <p className="text-3xl font-bold text-red-600">
              {reportData.summary.total_revoked || 0}
            </p>
          </Card>
        </div>
      )}

      {/* Campaign Breakdown */}
      {reportData?.campaigns && (
        <Card>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Breakdown</h2>
          </div>
          <Table
            columns={columns}
            data={reportData.campaigns}
            emptyMessage="No campaigns found"
          />
        </Card>
      )}
    </div>
  )
}

export default RecertificationSummary
