import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { campaignService } from '../../services/campaignService'
import { HiArrowLeft, HiUsers, HiCheckCircle, HiClock } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Table from '../common/Table'
import Loader from '../common/Loader'
import { getStatusColor, formatDate } from '../../utils/helpers'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import toast from 'react-hot-toast'

const CampaignDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [stats, setStats] = useState(null)
  const [reviewers, setReviewers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaignData()
  }, [id])

  const loadCampaignData = async () => {
    try {
      setLoading(true)
      const [campaignData, statsData, reviewersData] = await Promise.all([
        campaignService.getCampaign(id),
        campaignService.getCampaignStats(id),
        campaignService.getCampaignReviewers(id),
      ])
      setCampaign(campaignData)
      setStats(statsData)
      setReviewers(reviewersData)
    } catch (error) {
      toast.error('Failed to load campaign details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader fullScreen />
  }

  if (!campaign) {
    return (
      <Card>
        <p className="text-gray-600 text-center py-8">Campaign not found</p>
      </Card>
    )
  }

  const reviewerColumns = [
    {
      header: 'Reviewer',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.reviewer_name}</p>
          <p className="text-sm text-gray-600">{row.reviewer_email}</p>
        </div>
      ),
    },
    {
      header: 'Assigned',
      accessor: 'total_assigned',
      cell: (row) => (
        <span className="text-gray-900 font-medium">{row.total_assigned}</span>
      ),
    },
    {
      header: 'Completed',
      accessor: 'completed_count',
      cell: (row) => (
        <span className="text-gray-900 font-medium">{row.completed_count}</span>
      ),
    },
    {
      header: 'Progress',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                style={{ width: `${row.completion_percentage}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-900">{row.completion_percentage}%</span>
        </div>
      ),
    },
  ]

  const decisionData = [
    { name: 'Approved', value: stats?.approved_count || 0, color: '#10b981' },
    { name: 'Revoked', value: stats?.revoked_count || 0, color: '#ef4444' },
    { name: 'Exception', value: stats?.exception_count || 0, color: '#f59e0b' },
    { name: 'Pending', value: (stats?.total_reviews || 0) - (stats?.completed_reviews || 0), color: '#6b7280' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          icon={HiArrowLeft}
          onClick={() => navigate('/campaigns')}
        >
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <Badge variant={getStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-gray-600">{campaign.description || 'Campaign details and progress'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_reviews || 0}</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <HiCheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completion</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.completion_percentage || 0}%</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <HiCheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Reviewers</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.reviewer_count || 0}</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <HiUsers className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.days_remaining || 0}</p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
              <HiClock className="h-8 w-8 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Review Decisions">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={decisionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {decisionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Campaign Timeline">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Start Date</p>
                <p className="text-sm text-gray-600">{formatDate(campaign.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Current Progress</p>
                <p className="text-sm text-gray-600">{stats?.completion_percentage}% Complete</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">End Date</p>
                <p className="text-sm text-gray-600">{formatDate(campaign.end_date)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reviewers Table */}
      <Card title="Reviewers">
        <Table
          columns={reviewerColumns}
          data={reviewers}
          emptyMessage="No reviewers assigned"
        />
      </Card>
    </div>
  )
}

export default CampaignDetail