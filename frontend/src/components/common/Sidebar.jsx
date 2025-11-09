import { NavLink } from 'react-router-dom'
import { 
  HiHome, 
  HiUsers, 
  HiClipboardList, 
  HiCheckCircle,
  HiShieldCheck,
  HiChartBar,
} from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user } = useAuth()

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HiHome },
    { name: 'Users', path: '/users', icon: HiUsers, adminOnly: true },
    { name: 'Campaigns', path: '/campaigns', icon: HiClipboardList, adminOnly: true },
    { name: 'Reviews', path: '/reviews', icon: HiCheckCircle },
    { name: 'SOD Rules', path: '/sod', icon: HiShieldCheck, adminOnly: true },
    { name: 'Reports', path: '/reports', icon: HiChartBar, adminOnly: true },
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