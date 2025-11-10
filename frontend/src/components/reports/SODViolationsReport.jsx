import { useState, useEffect } from 'react'
import { HiDownload, HiExclamationCircle } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const SODViolationsReport = () => {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/reports/sod-violations', {
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
      toast.error('Failed to load SOD violations report')
    } finally {
      setLoading(false)
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

  const columns = [
    {
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.user_name}</p>
          <p className="text-sm text-gray-600">{row.department_name}</p>
        </div>
      ),
    },
    {
      header: 'Rule Violated',
      cell: (row) => (
        <div>
          <p className="text-gray-900">{row.rule_name}</p>
          <p className="text-sm text-gray-600">{row.process_area}</p>
        </div>
      ),
    },
    {
      header: 'Severity',
      accessor: 'severity',
      cell: (row) => getSeverityBadge(row.severity),
    },
    {
      header: 'Detected',
      accessor: 'detected_at',
      cell: (row) => (
        <span className="text-gray-900 text-sm">{formatDate(row.detected_at)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_resolved ? 'success' : 'danger'}>
          {row.is_resolved ? 'Resolved' : 'Open'}
        </Badge>
      ),
    },
    {
      header: 'Resolution',
      cell: (row) => (
        <div>
          {row.is_resolved ? (
            <div>
              <p className="text-sm text-gray-900 capitalize">
                {row.resolution_action?.replace('_', ' ')}
              </p>
              {row.resolved_at && (
                <p className="text-xs text-gray-600">{formatDate(row.resolved_at)}</p>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">-</span>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SOD Violations Report
            </h1>
            <p className="text-gray-600">Segregation of Duties conflicts and resolutions</p>
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
            SOD Violations Report
          </h1>
          <p className="text-gray-600">Segregation of Duties conflicts and resolutions</p>
        </div>
        <Button variant="primary" icon={HiDownload} disabled>
          Export Report
        </Button>
      </div>

      {/* Summary Stats */}
      {reportData?.summary && reportData.summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {reportData.summary.map((stat, idx) => (
            <Card key={idx}>
              <p className="text-sm text-gray-600 mb-1">{stat.severity} Severity</p>
              <p className="text-3xl font-bold text-gray-900">{stat.count || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stat.resolved || 0} resolved
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Violations Table */}
      {reportData?.violations && (
        <Card>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">All Violations</h2>
          </div>
          <Table
            columns={columns}
            data={reportData.violations}
            emptyMessage="No SOD violations found"
          />
        </Card>
      )}

      {!reportData?.violations || reportData.violations.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <HiExclamationCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Violations</h3>
            <p className="mt-1 text-gray-500">
              No SOD violations detected in your organization
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default SODViolationsReport
