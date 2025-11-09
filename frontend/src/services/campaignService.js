import api from './api'

export const campaignService = {
  getCampaigns: async (params = {}) => {
    const response = await api.get('/campaigns', { params })
    return response.data
  },

  getCampaign: async (id) => {
    const response = await api.get(`/campaigns/${id}`)
    return response.data
  },

  createCampaign: async (campaignData) => {
    const response = await api.post('/campaigns', campaignData)
    return response.data
  },

  updateCampaign: async (id, campaignData) => {
    const response = await api.put(`/campaigns/${id}`, campaignData)
    return response.data
  },

  launchCampaign: async (id) => {
    const response = await api.post(`/campaigns/${id}/launch`)
    return response.data
  },

  getCampaignStats: async (id) => {
    const response = await api.get(`/campaigns/${id}/stats`)
    return response.data
  },

  getCampaignReviewers: async (id) => {
    const response = await api.get(`/campaigns/${id}/reviewers`)
    return response.data
  },

  deleteCampaign: async (id) => {
    const response = await api.delete(`/campaigns/${id}`)
    return response.data
  },
}