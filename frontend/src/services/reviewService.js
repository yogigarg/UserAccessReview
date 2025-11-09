import api from './api'

export const reviewService = {
  getPendingReviews: async (params = {}) => {
    const response = await api.get('/reviews/pending', { params })
    return response.data
  },

  getReviewItem: async (id) => {
    const response = await api.get(`/reviews/${id}`)
    return response.data
  },

  submitDecision: async (id, decision) => {
    const response = await api.post(`/reviews/${id}/decision`, decision)
    return response.data
  },

  bulkApprove: async (reviewItemIds, rationale) => {
    const response = await api.post('/reviews/bulk-approve', {
      reviewItemIds,
      rationale,
    })
    return response.data
  },

  addComment: async (id, comment) => {
    const response = await api.post(`/reviews/${id}/comments`, comment)
    return response.data
  },

  getReviewerStats: async () => {
    const response = await api.get('/reviews/stats')
    return response.data
  },
}