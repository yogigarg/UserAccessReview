import { useState, useEffect } from 'react'
import { managerService } from '../../services/managerService'
import { HiUsers, HiChevronDown, HiChevronRight, HiMail, HiBriefcase } from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import toast from 'react-hot-toast'

const OrgHierarchy = () => {
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  useEffect(() => {
    loadHierarchy()
  }, [])

  const loadHierarchy = async () => {
    try {
      setLoading(true)
      const response = await managerService.getOrgHierarchy()
      setHierarchy(response.data || response || [])
    } catch (error) {
      console.error('Failed to load hierarchy:', error)
      toast.error('Failed to load organizational hierarchy')
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (userId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const buildTree = (employees, managerId = null, level = 0) => {
    const children = employees.filter(emp => emp.manager_id === managerId)
    
    if (children.length === 0) return null

    return children.map(employee => {
      const hasChildren = employees.some(e => e.manager_id === employee.id)
      const isExpanded = expandedNodes.has(employee.id)

      return (
        <div key={employee.id} className="ml-6">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow mb-2">
            {hasChildren && (
              <button
                onClick={() => toggleNode(employee.id)}
                className="mt-1 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <HiChevronDown className="h-5 w-5" />
                ) : (
                  <HiChevronRight className="h-5 w-5" />
                )}
              </button>
            )}
            
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  {employee.first_name} {employee.last_name}
                </h3>
                <Badge variant="info" size="sm">
                  Level {employee.level}
                </Badge>
                {employee.direct_reports_count > 0 && (
                  <Badge variant="secondary" size="sm">
                    {employee.direct_reports_count} reports
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <HiBriefcase className="h-4 w-4" />
                  <span>{employee.job_title || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HiMail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </div>
                {employee.department_name && (
                  <div className="flex items-center gap-1">
                    <HiUsers className="h-4 w-4" />
                    <span>{employee.department_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="border-l-2 border-gray-200 ml-3">
              {buildTree(employees, employee.id, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Hierarchy</h1>
          <p className="text-gray-600">View and manage reporting structure</p>
        </div>
        <Card>
          <Loader />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Hierarchy</h1>
          <p className="text-gray-600">View and manage reporting structure</p>
        </div>
        <Button variant="secondary" onClick={loadHierarchy}>
          Refresh
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Organizational Tree</h2>
          <p className="text-sm text-gray-600 mt-1">
            {hierarchy.length} employees in hierarchy
          </p>
        </div>

        <div className="p-6">
          {hierarchy.length === 0 ? (
            <div className="text-center py-12">
              <HiUsers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hierarchy data available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buildTree(hierarchy)}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OrgHierarchy