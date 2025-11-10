import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { HiArrowLeft } from 'react-icons/hi'
import api from '../../services/api'
import { toast } from 'react-hot-toast'
import Loader from '../common/Loader'

const ApplicationForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    application_type: '',
    vendor: '',
    business_criticality: 'medium',
    compliance_scope: '',
    connector_type: '',
    is_active: true,
  })

  useEffect(() => {
    if (isEditMode) {
      fetchApplication()
    }
  }, [id])

  const fetchApplication = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/applications/${id}`)
      const data = response.data?.data || response.data
      setFormData({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        application_type: data.application_type || '',
        vendor: data.vendor || '',
        business_criticality: data.business_criticality || 'medium',
        compliance_scope: data.compliance_scope || '',
        connector_type: data.connector_type || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
    } catch (error) {
      console.error('Error fetching application:', error)
      toast.error('Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name || !formData.code) {
      toast.error('Name and Code are required')
      return
    }

    if (!formData.application_type) {
      toast.error('Application Type is required')
      return
    }

    try {
      setLoading(true)
      
      // Convert snake_case to camelCase for backend
      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description || '',
        applicationType: formData.application_type,
        vendor: formData.vendor || '',
        businessCriticality: formData.business_criticality,
        complianceScope: formData.compliance_scope || '',
        connectorType: formData.connector_type || '',
        isActive: formData.is_active,
      }
      
      if (isEditMode) {
        await api.put(`/applications/${id}`, payload)
        toast.success('Application updated successfully')
      } else {
        await api.post('/applications', payload)
        toast.success('Application created successfully')
      }
      
      navigate('/applications')
    } catch (error) {
      console.error('Error saving application:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.message ||
                          'Failed to save application'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEditMode) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/applications')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <HiArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Application' : 'Create Application'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode ? 'Update application details' : 'Add a new application to the system'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SAP ERP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  disabled={isEditMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="e.g., SAP_ERP"
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the application..."
                />
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Type
                </label>
                <select
                  name="application_type"
                  value={formData.application_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="ERP">ERP</option>
                  <option value="CRM">CRM</option>
                  <option value="HRMS">HRMS</option>
                  <option value="Directory">Directory</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Database">Database</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Cloud">Cloud Platform</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SAP, Microsoft, Salesforce"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Criticality
                </label>
                <select
                  name="business_criticality"
                  value={formData.business_criticality}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Scope
                </label>
                <input
                  type="text"
                  name="compliance_scope"
                  value={formData.compliance_scope}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., SOX, HIPAA, PCI-DSS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connector Type
                </label>
                <select
                  name="connector_type"
                  value={formData.connector_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Manual / No Connector</option>
                  <option value="Active Directory">Active Directory</option>
                  <option value="Azure AD">Azure AD / Entra ID</option>
                  <option value="Okta">Okta</option>
                  <option value="SAP">SAP</option>
                  <option value="Oracle">Oracle EBS</option>
                  <option value="Salesforce">Salesforce</option>
                  <option value="ServiceNow">ServiceNow</option>
                  <option value="Workday">Workday</option>
                  <option value="AWS IAM">AWS IAM</option>
                  <option value="Google Workspace">Google Workspace</option>
                  <option value="Microsoft 365">Microsoft 365</option>
                  <option value="LDAP">LDAP</option>
                  <option value="REST API">REST API</option>
                  <option value="Custom">Custom Connector</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active Application</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Application' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationForm
