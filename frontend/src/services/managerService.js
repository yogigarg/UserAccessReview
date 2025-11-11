import api from './api'

export const managerService = {
  getOrgHierarchy: async () => {
    const response = await api.get('/managers/hierarchy')
    return response.data
  },

  getOrgChart: async () => {
    const response = await api.get('/managers/org-chart')
    return response.data
  },

  getManagerEmployees: async (managerId, params = {}) => {
    const response = await api.get(`/managers/employees/${managerId}`, { params })
    return response.data
  },

  createMapping: async (mappingData) => {
    const response = await api.post('/managers/mapping', mappingData)
    return response.data
  },

  updateMapping: async (id, mappingData) => {
    const response = await api.put(`/managers/mapping/${id}`, mappingData)
    return response.data
  },

  deleteMapping: async (id) => {
    const response = await api.delete(`/managers/mapping/${id}`)
    return response.data
  },

  getDelegates: async (params = {}) => {
    const response = await api.get('/managers/delegates', { params })
    return response.data
  },

  createDelegate: async (delegateData) => {
    const response = await api.post('/managers/delegates', delegateData)
    return response.data
  },

  updateDelegate: async (id, delegateData) => {
    const response = await api.put(`/managers/delegates/${id}`, delegateData)
    return response.data
  },

  deleteDelegate: async (id) => {
    const response = await api.delete(`/managers/delegates/${id}`)
    return response.data
  },

  syncFromHRMS: async (syncData) => {
    const response = await api.post('/managers/sync/hrms', syncData)
    return response.data
  },

  getSyncStatus: async () => {
    const response = await api.get('/managers/sync/status')
    return response.data
  },

  getDepartments: async () => {
    const response = await api.get('/managers/departments')
    return response.data
  },

  createDepartment: async (deptData) => {
    const response = await api.post('/managers/departments', deptData)
    return response.data
  },

  updateDepartment: async (id, deptData) => {
    const response = await api.put(`/managers/departments/${id}`, deptData)
    return response.data
  },
}