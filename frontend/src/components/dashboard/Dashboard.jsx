import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { HiUsers, HiClipboardList, HiCheckCircle, HiExclamation } from 'react-icons/hi'
import StatsCard from './StatsCard'
import Card from '../common/Card'
import Table from '../common/Table'
import Button from '../common/Button'
import Loader from '../common/Loader'
import Badge from '../common/Badge'
import { formatRelativeTime, getStatusColor } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [myReviews, setMyReviews] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, activityData, reviewsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(10),
        dashboardService.getMyReviews(),
      ])

      setStats(statsData)
      setRecentActivity(activityData)
      setMyReviews(reviewsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader fullScreen />
  }

  const activityColumns = [
    {
      header: 'Action',
      accessor: 'action',
      cell: (row) => (
        <Badge variant={getStatusColor(row.action)}>
          {row.action?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Entity',
      accessor: 'entity_type',
      cell: (row) => (
        <span className="capitalize text-gray-800">{row.entity_type}</span>
      ),
    },
    {
      header: 'User',
      accessor: 'user_name',
      cell: (row) => (
        <span className="text-gray-800">{row.user_name}</span>
      ),
    },
    {
      header: 'Time',
      accessor: 'created_at',
      cell: (row) => (
        <span className="text-gray-600">{formatRelativeTime(row.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your access review system</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={HiUsers}
          color="blue"
        />
        <StatsCard
          title="Active Campaigns"
          value={stats?.active_campaigns || 0}
          icon={HiClipboardList}
          color="purple"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats?.pending_reviews || 0}
          icon={HiCheckCircle}
          color="yellow"
        />
        <StatsCard
          title="SOD Violations"
          value={stats?.active_sod_violations || 0}
          icon={HiExclamation}
          color="red"
        />
      </div>

      {/* My Reviews Section (for reviewers) */}
      {myReviews && myReviews.statistics.total_assigned > 0 && (
        <Card title="My Pending Reviews" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Assigned</p>
              <p className="text-3xl font-bold text-gray-900">{myReviews.statistics.total_assigned}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{myReviews.statistics.pending}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {Math.round((myReviews.statistics.completed / myReviews.statistics.total_assigned) * 100)}%
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => navigate('/reviews')}
            >
              View My Reviews
            </Button>
          </div>
        </Card>
      )}

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card 
          title="Recent Activity"
          actions={
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/reports')}
            >
              View All
            </Button>
          }
        >
          <Table
            columns={activityColumns}
            data={recentActivity}
            emptyMessage="No recent activity"
          />
        </Card>

        {/* Quick Stats */}
        <Card title="System Health">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">High Risk Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.high_risk_users || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <HiExclamation className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Dormant Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.dormant_accounts || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <HiUsers className="h-6 w-6 text-yellow-600" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_applications || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <HiClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard