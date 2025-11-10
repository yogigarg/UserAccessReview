import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  HiArrowLeft, 
  HiPencil, 
  HiShieldCheck,
  HiUsers,
  HiKey,
  HiClock,
} from 'react-icons/hi'
import api from '../../services/api'
import Loader from '../common/Loader'
import { toast } from 'react-hot-toast'

const ApplicationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchApplicationDetails()
  }, [id])

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch application details
      const appResponse = await api.get(`/applications/${id}`)
      const appData = appResponse.data?.data || appResponse.data
      setApplication(appData)

      // Fetch roles
      const rolesResponse = await api.get(`/applications/${id}/roles`)
      const rolesData = rolesResponse.data?.data || rolesResponse.data
      setRoles(Array.isArray(rolesData) ? rolesData : [])

      // Fetch users
      const usersResponse = await api.get(`/applications/${id}/users`)
      const usersResponseData = usersResponse.data?.data || usersResponse.data
      const usersData = usersResponseData.data || usersResponseData
      setUsers(Array.isArray(usersData) ? usersData : [])
      
    } catch (error) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadgeColor = (level) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }
    return colors[level] || 'bg-gray-100 text-gray-800'
  }

  if (loading) return <Loader />
  if (!application) return <div className="text-center py-12">Application not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/applications')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
            <p className="text-gray-600 mt-1">{application.code}</p>
          </div>
        </div>
        <Link
          to={`/applications/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <HiPencil className="h-5 w-5" />
          Edit Application
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiKey className="h-8 w-8 text-blue-600" />
            <div className="text-sm text-gray-600">Total Roles</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{roles.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiUsers className="h-8 w-8 text-green-600" />
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiShieldCheck className="h-8 w-8 text-orange-600" />
            <div className="text-sm text-gray-600">Risk Score</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{application.risk_score || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <HiClock className="h-8 w-8 text-purple-600" />
            <div className="text-sm text-gray-600">Last Sync</div>
          </div>
          <div className="text-sm font-medium text-gray-900">
            {application.last_sync_at 
              ? new Date(application.last_sync_at).toLocaleDateString()
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'roles', 'users'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Application Type</h3>
                  <p className="text-gray-900 capitalize">{application.application_type || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Vendor</h3>
                  <p className="text-gray-900">{application.vendor || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Business Criticality</h3>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${getRiskBadgeColor(application.business_criticality)}`}>
                    {application.business_criticality || 'N/A'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Compliance Scope</h3>
                  <p className="text-gray-900">{application.compliance_scope || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Connector Type</h3>
                  <p className="text-gray-900">{application.connector_type || 'Manual'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sync Status</h3>
                  <p className="text-gray-900">{application.sync_status || 'Not Configured'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900">{application.description || 'No description provided'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  application.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {application.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        No roles defined for this application
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{role.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{role.code}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRiskBadgeColor(role.risk_level)}`}>
                            {role.risk_level || 'low'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {role.assignment_count || 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        No users have access to this application
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.employee_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {user.department_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {user.role_count || 0} role(s)
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/users/${user.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApplicationDetail
