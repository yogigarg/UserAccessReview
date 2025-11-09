import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { campaignService } from '../../services/campaignService'
import { HiArrowLeft, HiSave } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Input from '../common/Input'
import Loader from '../common/Loader'
import toast from 'react-hot-toast'

const CampaignForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'manager_review',
    start_date: '',
    end_date: '',
    reminder_frequency_days: 3,
  })

  useEffect(() => {
    if (isEditMode) {
      loadCampaign()
    }
  }, [id])

  const loadCampaign = async () => {
    try {
      setLoading(true)
      const campaign = await campaignService.getCampaign(id)
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        campaign_type: campaign.campaign_type || 'manager_review',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        reminder_frequency_days: campaign.reminder_frequency_days || 3,
      })
    } catch (error) {
      toast.error('Failed to load campaign')
      navigate('/campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (isEditMode) {
        await campaignService.updateCampaign(id, formData)
        toast.success('Campaign updated successfully')
      } else {
        await campaignService.createCampaign(formData)
        toast.success('Campaign created successfully')
      }
      navigate('/campaigns')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save campaign')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader fullScreen />
  }

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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isEditMode ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
          <p className="text-white/70">
            {isEditMode ? 'Update campaign details' : 'Set up a new access review campaign'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Name */}
          <Input
            label="Campaign Name *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Q4 2024 Access Review"
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Quarterly access review for all users..."
              className="input-glass min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Campaign Type *
              </label>
              <select
                name="campaign_type"
                value={formData.campaign_type}
                onChange={handleChange}
                className="input-glass"
                required
              >
                <option value="manager_review">Manager Review</option>
                <option value="application_owner">Application Owner Review</option>
                <option value="both">Both</option>
                <option value="ad_hoc">Ad-hoc Review</option>
              </select>
            </div>

            {/* Reminder Frequency */}
            <Input
              label="Reminder Frequency (days)"
              type="number"
              name="reminder_frequency_days"
              value={formData.reminder_frequency_days}
              onChange={handleChange}
              min="1"
              max="30"
            />

            {/* Start Date */}
            <Input
              label="Start Date *"
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
            />

            {/* End Date */}
            <Input
              label="End Date *"
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/campaigns')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={HiSave}
              loading={submitting}
            >
              {isEditMode ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default CampaignForm