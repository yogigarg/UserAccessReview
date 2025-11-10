import { useState } from 'react'
import { HiSearch, HiDownload } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const UserAccessReport = () => {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [reportData, setReportData] = useState(null)

  const loadReport = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a user ID')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/v1/reports/user-access/${userId}`, {
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
      toast.error('Failed to load user access report')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Access Report
          </h1>
          <p className="text-gray-600">Detailed access rights for individual users</p>
        </div>
        {reportData && (
          <Button variant="primary" icon={HiDownload} disabled>
            Export Report
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadReport()}
              placeholder="Enter user UUID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="primary"
              icon={HiSearch}
              onClick={loadReport}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Searching...' : 'Search User'}
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <Card>
          <Loader />
        </Card>
      )}

      {/* User Details */}
      {reportData?.user && !loading && (
        <>
          <Card>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="text-gray-900 font-medium">
                    {reportData.user.first_name} {reportData.user.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900">{reportData.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Employee ID</p>
                  <p className="text-gray-900">{reportData.user.employee_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Department</p>
                  <p className="text-gray-900">{reportData.user.department_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Manager</p>
                  <p className="text-gray-900">{reportData.user.manager_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge variant={reportData.user.status === 'active' ? 'success' : 'secondary'}>
                    {reportData.user.status}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Active Access */}
          <Card>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Active Access Rights</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Granted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.access && reportData.access.length > 0 ? (
                    reportData.access.map((access, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{access.application_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{access.role_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(access.granted_date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {access.last_reviewed_date ? formatDate(access.last_reviewed_date) : 'Never'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No active access rights found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* SOD Violations */}
          {reportData.sod_violations && reportData.sod_violations.length > 0 && (
            <Card>
              <div className="p-4 border-b bg-red-50">
                <h2 className="text-lg font-semibold text-red-900">SOD Violations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detected</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.sod_violations.map((violation, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{violation.rule_name}</td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            violation.severity === 'critical' ? 'danger' :
                            violation.severity === 'high' ? 'warning' : 'info'
                          }>
                            {violation.severity}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(violation.detected_at)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={violation.is_resolved ? 'success' : 'danger'}>
                            {violation.is_resolved ? 'Resolved' : 'Open'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Review History */}
          {reportData.review_history && reportData.review_history.length > 0 && (
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Review History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Decision</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.review_history.map((review, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{review.campaign_name}</td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            review.decision === 'approved' ? 'success' :
                            review.decision === 'revoked' ? 'danger' : 'warning'
                          }>
                            {review.decision}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{review.reviewer_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(review.decision_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!loading && !reportData && (
        <Card>
          <div className="text-center py-12">
            <HiSearch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Search for a User</h3>
            <p className="mt-1 text-gray-500">
              Enter a user ID above to generate their access report
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default UserAccessReport
