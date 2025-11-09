import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { campaignService } from '../../services/campaignService'
import { HiPlus, HiEye, HiPlay } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { getStatusColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const CampaignList = () => {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const response = await campaignService.getCampaigns()
      
      console.log('Campaign API Response:', response)
      
      // Handle both response.data and response directly
      const campaignData = response.data || response || []
      
      setCampaigns(Array.isArray(campaignData) ? campaignData : [])
      
      if (campaignData.length === 0) {
        console.warn('No campaigns found in response')
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
      toast.error('Failed to load campaigns')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const handleLaunchCampaign = async (id, e) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to launch this campaign?')) {
      return
    }

    try {
      await campaignService.launchCampaign(id)
      toast.success('Campaign launched successfully')
      loadCampaigns()
    } catch (error) {
      toast.error('Failed to launch campaign')
    }
  }

  const columns = [
    {
      header: 'Campaign Name',
      accessor: 'name',
      cell: (row) => (
        <div>
          <p className="font-medium text-white">{row.name}</p>
          <p className="text-sm text-white/60 capitalize">{row.campaign_type?.replace('_', ' ')}</p>
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
          <p className="text-white text-sm">{formatDate(row.start_date)}</p>
          <p className="text-white/60 text-sm">to {formatDate(row.end_date)}</p>
        </div>
      ),
    },
    {
      header: 'Progress',
      cell: (row) => {
        const completionPercentage = parseFloat(row.completion_percentage) || 0
        const completedReviews = parseInt(row.completed_reviews) || 0
        const totalReviews = parseInt(row.total_reviews) || 0
        
        return (
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">{completionPercentage}%</span>
              <span className="text-sm text-white/60">
                {completedReviews}/{totalReviews}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Days Remaining',
      accessor: 'days_remaining',
      cell: (row) => {
        const daysRemaining = parseInt(row.days_remaining) || 0
        return (
          <Badge variant={daysRemaining < 0 ? 'danger' : daysRemaining < 7 ? 'warning' : 'success'}>
            {daysRemaining < 0 ? 'Overdue' : `${daysRemaining} days`}
          </Badge>
        )
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          {row.status === 'draft' && (
            <Button
              variant="success"
              size="sm"
              icon={HiPlay}
              onClick={(e) => handleLaunchCampaign(row.id, e)}
            >
              Launch
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={HiEye}
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/campaigns/${row.id}`)
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-white/70">Manage access review campaigns</p>
        </div>
        <Button
          variant="primary"
          icon={HiPlus}
          onClick={() => navigate('/campaigns/new')}
        >
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Table */}
      {loading ? (
        <Card>
          <Loader />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={campaigns}
          loading={loading}
          emptyMessage="No campaigns found"
          onRowClick={(row) => navigate(`/campaigns/${row.id}`)}
        />
      )}
    </div>
  )
}

export default CampaignList