import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  HiDocumentReport, 
  HiUserGroup, 
  HiShieldExclamation, 
  HiClock,
  HiClipboardCheck,
  HiDocumentText 
} from 'react-icons/hi'
import Card from '../common/Card'
import Button from '../common/Button'
import toast from 'react-hot-toast'

const Reports = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const reportCategories = [
    {
      title: 'Campaign Reports',
      icon: HiClipboardCheck,
      color: 'blue',
      reports: [
        {
          id: 'recertification-summary',
          name: 'Recertification Summary',
          description: 'Overview of all access recertification campaigns',
          path: '/reports/recertification-summary',
        },
      ],
    },
    {
      title: 'Compliance & Risk',
      icon: HiShieldExclamation,
      color: 'red',
      reports: [
        {
          id: 'sod-violations',
          name: 'SOD Violations Report',
          description: 'Segregation of Duties conflicts and resolutions',
          path: '/reports/sod-violations',
        },
        {
          id: 'dormant-accounts',
          name: 'Dormant Accounts',
          description: 'Inactive user accounts requiring review',
          path: '/reports/dormant-accounts',
        },
      ],
    },
    {
      title: 'User & Access',
      icon: HiUserGroup,
      color: 'green',
      reports: [
        {
          id: 'user-access',
          name: 'User Access Report',
          description: 'Detailed access rights for individual users',
          path: '/reports/user-access',
        },
      ],
    },
    {
      title: 'Audit & Activity',
      icon: HiDocumentText,
      color: 'purple',
      reports: [
        {
          id: 'audit-logs',
          name: 'Audit Log Report',
          description: 'System activity and change history',
          path: '/reports/audit-logs',
        },
      ],
    },
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">
            Generate and view compliance and access reports
          </p>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category) => {
          const Icon = category.icon
          return (
            <div key={category.title}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${getColorClasses(category.color)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {category.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div 
                      className="p-2"
                      onClick={() => navigate(report.path)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <HiDocumentReport className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {report.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {report.description}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(report.path)
                        }}
                      >
                        View Report
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Export */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Export
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Export reports in various formats for offline analysis and compliance documentation
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" disabled>
              Export to PDF
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Export to Excel
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Export to CSV
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Export functionality coming soon
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Reports
