import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userService } from '../../services/userService'
import { HiPlus, HiSearch, HiEye } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Input from '../common/Input'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { getStatusColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const UserList = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  useEffect(() => {
    loadUsers()
  }, [pagination.page])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await userService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      })

      console.log('Users API Response:', response)

      // Handle response structure - check if data is nested
      const userData = response.data || response || []
      const paginationData = response.pagination || {}

      setUsers(Array.isArray(userData) ? userData : [])
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 1,
      }))
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    loadUsers()
  }

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employee_id',
      cell: (row) => (
        <span className="font-medium text-white">{row.employee_id}</span>
      ),
    },
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-white">{row.first_name} {row.last_name}</p>
            <p className="text-sm text-white/60">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department_name',
      cell: (row) => (
        <span className="text-white/80">{row.department_name || 'N/A'}</span>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      cell: (row) => (
        <Badge variant="info">
          {row.role?.replace('_', ' ')}
        </Badge>
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
      header: 'Access Items',
      accessor: 'access_count',
      cell: (row) => (
        <span className="text-white font-medium">{row.access_count || 0}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={HiEye}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/users/${row.id}`)
          }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
          <p className="text-gray-600">Manage users and their access</p>
        </div>
        <Button
          variant="primary"
          icon={HiPlus}
          onClick={() => navigate('/users/new')}
        >
          Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={HiSearch}
              placeholder="Search users by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Card>
          <Loader />
        </Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="No users found"
            onRowClick={(row) => navigate(`/users/${row.id}`)}
          />

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default UserList