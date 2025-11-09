import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          const userData = await authService.getCurrentUser()
          setUser(userData)
          setToken(savedToken)
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          setToken(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const { user: userData, token: userToken, refreshToken } = response

      localStorage.setItem('token', userToken)
      localStorage.setItem('refreshToken', refreshToken)
      setToken(userToken)
      setUser(userData)

      toast.success(`Welcome back, ${userData.first_name}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      setToken(null)
      setUser(null)
      toast.success('Logged out successfully')
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isComplianceManager: user?.role === 'compliance_manager',
    canManageCampaigns: ['admin', 'compliance_manager'].includes(user?.role),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}