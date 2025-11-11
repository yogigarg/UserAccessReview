import { useState, useEffect } from 'react'
import { managerService } from '../../services/managerService'
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Modal from '../common/Modal'
import Loader from '../common/Loader'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const ManagerDelegates = () => {
  const [delegates, setDelegates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDelegate, setEditingDelegate] = useState(null)
  const [formData, setFormData] = useState({
    manager_id: '',
    delegate_user_id: '',
    delegation_start: '',
    delegation_end: '',
    delegation_reason: '',
  })

  useEffect(() => {
    loadDelegates()
  }, [])

  const loadDelegates = async () => {
    try {
      setLoading(true)
      const response = await managerService.getDelegates()
      setDelegates(response.data || response || [])
    } catch (error) {
      console.error('Failed to load delegates:', error)
      toast.error('Failed to load delegates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingDelegate) {
        await managerService.updateDelegate(editingDelegate.id, formData)
        toast.success('Delegate updated successfully')
      } else {
        await managerService.createDelegate(formData)
        toast.success('Delegate created successfully')
      }
      
      setShowModal(false)
      setEditingDelegate(null)
      setFormData({
        manager_id: '',
        delegate_user_id: '',
        delegation_start: '',
        delegation_end: '',
        delegation_reason: '',
      })
      loadDelegates()
    } catch (error) {
      console.error('Save delegate error:', error)
      toast.error('Failed to save delegate')
    }
  }

  const handleEdit = (delegate) => {
    setEditingDelegate(delegate)
    setFormData({
      manager_id: delegate.manager_id,
      delegate_user_id: delegate.delegate_user_id,
      delegation_start: delegate.delegation_start?.split('T')[0] || '',
      delegation_end: delegate.delegation_end?.split('T')[0] || '',
      delegation_reason: delegate.delegation_reason || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this delegation?')) return

    try {
      await managerService.deleteDelegate(id)
      toast.success('Delegate deleted successfully')
      loadDelegates()
    } catch (error) {
      console.error('Delete delegate error:', error)
      toast.error('Failed to delete delegate')
    }
  }

  const columns = [
    {
      header: 'Manager',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.manager_name}</p>
          <p className="text-sm text-gray-600">{row.manager_email}</p>
        </div>
      ),
    },
    {
      header: 'Delegate',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.delegate_name}</p>
          <p className="text-sm text-gray-600">{row.delegate_email}</p>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department_name',
      cell: (row) => (
        <span className="text-gray-900">{row.department_name || 'All'}</span>
      ),
    },
    {
      header: 'Period',
      cell: (row) => (
        <div className="text-sm">
          <p className="text-gray-900">{formatDate(row.delegation_start)}</p>
          <p className="text-gray-600">to {formatDate(row.delegation_end)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={HiPencil}
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(row)
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={HiTrash}
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(row.id)
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Delegates</h1>
          <p className="text-gray-600">Manage delegation assignments</p>
        </div>
        <Button
          variant="primary"
          icon={HiPlus}
          onClick={() => {
            setEditingDelegate(null)
            setFormData({
              manager_id: '',
              delegate_user_id: '',
              delegation_start: '',
              delegation_end: '',
              delegation_reason: '',
            })
            setShowModal(true)
          }}
        >
          Add Delegation
        </Button>
      </div>

      {loading ? (
        <Card>
          <Loader />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={delegates}
          emptyMessage="No delegations found"
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDelegate ? 'Edit Delegation' : 'Add Delegation'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
  		<label className="block text-sm font-medium text-gray-700 mb-2">
  		  Manager ID * (UUID)
 	        </label>
 		<input
  		  type="text"
 	          value={formData.manager_id}
    		  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
    		  placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
   		  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    		  required
  		/>
	</div>

	<div>
		<label className="block text-sm font-medium text-gray-700 mb-2">	
		  Delegate User ID * (UUID)
 		</label>
		<input
		  type="text"
  		  value={formData.delegate_user_id}
 		  onChange={(e) => setFormData({ ...formData, delegate_user_id: e.target.value })}
 		  placeholder="e.g., 123e4567-e89b-12d3-a456-426614174001"
 		  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 		  required
		/>
	</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.delegation_start}
                onChange={(e) => setFormData({ ...formData, delegation_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.delegation_end}
                onChange={(e) => setFormData({ ...formData, delegation_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              value={formData.delegation_reason}
              onChange={(e) => setFormData({ ...formData, delegation_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingDelegate ? 'Update' : 'Create'} Delegation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ManagerDelegates