import { useState, useEffect } from 'react'
import { reviewService } from '../../services/reviewService'
import { HiCheckCircle, HiX, HiExclamation } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Modal from '../common/Modal'
import Loader from '../common/Loader'
import { getStatusColor, getRiskColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const ReviewList = () => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState(null)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [decision, setDecision] = useState('')
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadReviews()
    loadStats()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const response = await reviewService.getPendingReviews()
      setReviews(response.data)
    } catch (error) {
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await reviewService.getReviewerStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats')
    }
  }

  const handleReviewClick = (review) => {
    setSelectedReview(review)
    setShowDecisionModal(true)
    setDecision('')
    setRationale('')
  }

  const handleSubmitDecision = async () => {
    if (!decision) {
      toast.error('Please select a decision')
      return
    }

    if (decision === 'revoked' && !rationale) {
      toast.error('Rationale is required for revocations')
      return
    }

    try {
      setSubmitting(true)
      await reviewService.submitDecision(selectedReview.id, {
        decision,
        rationale,
      })
      toast.success('Decision submitted successfully')
      setShowDecisionModal(false)
      loadReviews()
      loadStats()
    } catch (error) {
      toast.error('Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium text-white">{row.user_name}</p>
          <p className="text-sm text-white/60">{row.employee_id}</p>
        </div>
      ),
    },
    {
      header: 'Application',
      cell: (row) => (
        <div>
          <p className="text-white">{row.application_name}</p>
          <p className="text-sm text-white/60">{row.role_name || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Risk',
      cell: (row) => (
        <Badge variant={getRiskColor(row.risk_level)}>
          {row.risk_level || 'N/A'}
        </Badge>
      ),
    },
    {
      header: 'Campaign',
      accessor: 'campaign_name',
      cell: (row) => (
        <span className="text-white/80">{row.campaign_name}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'campaign_end_date',
      cell: (row) => {
        const daysRemaining = row.days_remaining || 0
        return (
          <div>
            <p className="text-white text-sm">{formatDate(row.campaign_end_date)}</p>
            <Badge variant={daysRemaining < 0 ? 'danger' : daysRemaining < 7 ? 'warning' : 'info'} size="sm">
              {daysRemaining < 0 ? 'Overdue' : `${daysRemaining} days left`}
            </Badge>
          </div>
        )
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleReviewClick(row)}
        >
          Review
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Pending Reviews</h1>
        <p className="text-white/70">Review and certify user access</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-white/70 mb-1">Total Assigned</p>
            <p className="text-3xl font-bold text-white">{stats.total_assigned}</p>
          </Card>
          <Card>
            <p className="text-sm text-white/70 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
          </Card>
          <Card>
            <p className="text-sm text-white/70 mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
          </Card>
          <Card>
            <p className="text-sm text-white/70 mb-1">Completion</p>
            <p className="text-3xl font-bold text-white">{stats.completion_percentage}%</p>
          </Card>
        </div>
      )}

      {/* Reviews Table */}
      {loading ? (
        <Card>
          <Loader />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={reviews}
          emptyMessage="No pending reviews"
        />
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title="Review Access"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDecisionModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitDecision}
              loading={submitting}
            >
              Submit Decision
            </Button>
          </>
        }
      >
        {selectedReview && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="glass-dark p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Access Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">User:</span>
                  <span className="text-white font-medium">{selectedReview.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Application:</span>
                  <span className="text-white font-medium">{selectedReview.application_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Role:</span>
                  <span className="text-white font-medium">{selectedReview.role_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Risk Level:</span>
                  <Badge variant={getRiskColor(selectedReview.risk_level)}>
                    {selectedReview.risk_level || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Decision Options */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Decision *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecision('approved')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    decision === 'approved'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <HiCheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Approve</p>
                </button>
                <button
                  onClick={() => setDecision('revoked')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    decision === 'revoked'
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <HiX className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Revoke</p>
                </button>
              </div>
            </div>

            {/* Rationale */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Rationale {decision === 'revoked' && '*'}
              </label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Provide reasoning for your decision..."
                className="input-glass min-h-[100px]"
                required={decision === 'revoked'}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReviewList