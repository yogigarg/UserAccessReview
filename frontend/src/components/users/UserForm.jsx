import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { userService } from '../../services/userService'
import { HiArrowLeft, HiSave } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Input from '../common/Input'
import Loader from '../common/Loader'
import toast from 'react-hot-toast'

const UserForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'user',
    status: 'active',
    job_title: '',
    department_name: '',
    hire_date: '',
  })

  useEffect(() => {
    if (isEditMode) {
      loadUser()
    }
  }, [id])

  const loadUser = async () => {
    try {
      setLoading(true)
      const user = await userService.getUser(id)
      setFormData({
        employee_id: user.employee_id || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || 'user',
        status: user.status || 'active',
        job_title: user.job_title || '',
        department_name: user.department_name || '',
        hire_date: user.hire_date ? user.hire_date.split('T')[0] : '',
      })
    } catch (error) {
      toast.error('Failed to load user')
      navigate('/users')
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
        await userService.updateUser(id, formData)
        toast.success('User updated successfully')
      } else {
        await userService.createUser(formData)
        toast.success('User created successfully')
      }
      navigate('/users')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user')
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
          onClick={() => navigate('/users')}
        >
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isEditMode ? 'Edit User' : 'Add New User'}
          </h1>
          <p className="text-white/70">
            {isEditMode ? 'Update user information' : 'Create a new user account'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee ID */}
            <Input
              label="Employee ID *"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              placeholder="EMP001"
              required
            />

            {/* Email */}
            <Input
              label="Email Address *"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@acme.com"
              required
            />

            {/* First Name */}
            <Input
              label="First Name *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
            />

            {/* Last Name */}
            <Input
              label="Last Name *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
            />

            {/* Job Title */}
            <Input
              label="Job Title"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              placeholder="Software Engineer"
            />

            {/* Department */}
            <Input
              label="Department"
              name="department_name"
              value={formData.department_name}
              onChange={handleChange}
              placeholder="Engineering"
            />

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-glass"
                required
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="reviewer">Reviewer</option>
                <option value="compliance_manager">Compliance Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-glass"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            {/* Hire Date */}
            <Input
              label="Hire Date"
              type="date"
              name="hire_date"
              value={formData.hire_date}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/users')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={HiSave}
              loading={submitting}
            >
              {isEditMode ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default UserForm