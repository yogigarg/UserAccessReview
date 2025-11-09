import api from './api'

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  },

  getRecentActivity: async (limit = 20) => {
    const response = await api.get('/dashboard/activity', { params: { limit } })
    return response.data
  },

  getCampaignProgress: async () => {
    const response = await api.get('/dashboard/campaign-progress')
    return response.data
  },

  getComplianceOverview: async () => {
    const response = await api.get('/dashboard/compliance')
    return response.data
  },

  getMyReviews: async () => {
    const response = await api.get('/dashboard/my-reviews')
    return response.data
  },
}