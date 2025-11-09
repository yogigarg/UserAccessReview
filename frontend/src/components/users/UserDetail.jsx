import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { userService } from '../../services/userService'
import { HiArrowLeft, HiMail, HiBriefcase, HiCalendar, HiShieldCheck } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Table from '../common/Table'
import Loader from '../common/Loader'
import { getStatusColor, getRiskColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userAccess, setUserAccess] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [id])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const [userData, accessData] = await Promise.all([
        userService.getUser(id),
        userService.getUserAccess(id),
      ])
      setUser(userData)
      setUserAccess(accessData)
    } catch (error) {
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader fullScreen />
  }

  if (!user) {
    return (
      <Card>
        <p className="text-white/70 text-center py-8">User not found</p>
      </Card>
    )
  }

  const accessColumns = [
    {
      header: 'Application',
      accessor: 'application_name',
      cell: (row) => (
        <div>
          <p className="font-medium text-white">{row.application_name}</p>
          <p className="text-sm text-white/60">{row.application_code}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role_name',
      cell: (row) => (
        <span className="text-white/80">{row.role_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Risk Level',
      accessor: 'risk_level',
      cell: (row) => (
        <Badge variant={getRiskColor(row.risk_level)}>
          {row.risk_level || 'N/A'}
        </Badge>
      ),
    },
    {
      header: 'Granted Date',
      accessor: 'grant_date',
      cell: (row) => formatDate(row.grant_date),
    },
    {
      header: 'Last Used',
      accessor: 'last_used_date',
      cell: (row) => row.last_used_date ? formatDate(row.last_used_date) : 'Never',
    },
    {
      header: 'Status',
      accessor: 'usage_status',
      cell: (row) => (
        <Badge variant={getStatusColor(row.usage_status)}>
          {row.usage_status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          icon={HiArrowLeft}
          onClick={() => navigate('/users')}
        >
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">User Details</h1>
          <p className="text-white/70">Complete information and access history</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="text-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">
                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {user.first_name} {user.last_name}
            </h2>
            <Badge variant={getStatusColor(user.status)}>
              {user.status}
            </Badge>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3">
              <HiMail className="h-5 w-5 text-white/50 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Email</p>
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HiBriefcase className="h-5 w-5 text-white/50 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Job Title</p>
                <p className="text-white">{user.job_title || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HiCalendar className="h-5 w-5 text-white/50 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Hire Date</p>
                <p className="text-white">{formatDate(user.hire_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HiShieldCheck className="h-5 w-5 text-white/50 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/60">Role</p>
                <p className="text-white capitalize">{user.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Active Access</p>
                <p className="text-3xl font-bold text-white">{user.active_access_count || 0}</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <HiShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">SOD Violations</p>
                <p className="text-3xl font-bold text-white">{user.sod_violation_count || 0}</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <HiShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Risk Score</p>
                <p className="text-3xl font-bold text-white">{user.risk_score || 0}</p>
              </div>
              <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${
                (user.risk_score || 0) >= 70 ? 'from-red-500 to-red-600' :
                (user.risk_score || 0) >= 50 ? 'from-yellow-500 to-yellow-600' :
                'from-green-500 to-green-600'
              } flex items-center justify-center`}>
                <HiShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Department</p>
                <p className="text-lg font-medium text-white">{user.department_name || 'N/A'}</p>
                <p className="text-sm text-white/60 mt-1">
                  Manager: {user.manager_name || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Access Table */}
      <Card title="User Access">
        <Table
          columns={accessColumns}
          data={userAccess}
          emptyMessage="No access items found"
        />
      </Card>
    </div>
  )
}

export default UserDetail