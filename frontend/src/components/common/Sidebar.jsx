import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  HiHome, 
  HiUsers, 
  HiClipboardList, 
  HiCheckCircle,
  HiShieldCheck,
  HiChartBar,
  HiExclamationCircle,
  HiChevronDown,
  HiChevronRight,
  HiViewGrid,
  HiUserGroup,
} from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user } = useAuth()
  const [sodMenuOpen, setSodMenuOpen] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HiHome },
    { name: 'Users', path: '/users', icon: HiUsers, adminOnly: true },
    { name: 'Applications', path: '/applications', icon: HiViewGrid, adminOnly: true },
    { name: 'Campaigns', path: '/campaigns', icon: HiClipboardList, adminOnly: true },
    { name: 'Reviews', path: '/reviews', icon: HiCheckCircle },
    { name: 'Reports', path: '/reports', icon: HiChartBar, adminOnly: true },
  ]

  const sodMenuItems = [
    { name: 'SOD Rules', path: '/sod/rules', icon: HiShieldCheck },
    { name: 'SOD Violations', path: '/sod/violations', icon: HiExclamationCircle },
  ]

  const orgMenuItems = [
    { name: 'Hierarchy', path: '/managers/hierarchy', icon: HiUserGroup },
    { name: 'Delegates', path: '/managers/delegates', icon: HiUsers },
  ]

  const isAdmin = ['admin', 'compliance_manager'].includes(user?.role)

  return (
    <aside className="w-64 glass-dark border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="p-6 h-full flex flex-col">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient">UAR</h1>
          <p className="text-sm text-gray-600 mt-1">Access Review Platform</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-md border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            )
          })}

          {/* Organization Menu with Submenu - Only for admins */}
          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <HiUserGroup className="h-5 w-5" />
                  <span className="font-medium">Organization</span>
                </div>
                {orgMenuOpen ? (
                  <HiChevronDown className="h-4 w-4" />
                ) : (
                  <HiChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Organization Submenu */}
              {orgMenuOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {orgMenuItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SOD Menu with Submenu - Only for admins */}
          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setSodMenuOpen(!sodMenuOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <HiShieldCheck className="h-5 w-5" />
                  <span className="font-medium">SOD</span>
                </div>
                {sodMenuOpen ? (
                  <HiChevronDown className="h-4 w-4" />
                ) : (
                  <HiChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* SOD Submenu */}
              {sodMenuOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {sodMenuItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="pt-6 border-t border-gray-200 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-600 truncate capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar