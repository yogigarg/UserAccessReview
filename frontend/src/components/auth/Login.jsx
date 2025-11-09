import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import { HiMail, HiLockClosed } from 'react-icons/hi'
import Input from '../common/Input'
import Button from '../common/Button'

const Login = () => {
  const [email, setEmail] = useState('admin@acme.com')
  const [password, setPassword] = useState('Admin@123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold text-gradient mb-2"
          >
            UAR
          </motion.h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            User Access Review
          </h2>
          <p className="text-gray-600">
            Enterprise Identity Governance Platform
          </p>
        </div>

        {/* Login form */}
        <div className="glass-card border border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              icon={HiMail}
              placeholder="admin@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              icon={HiLockClosed}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p className="cursor-pointer hover:text-gray-900" onClick={() => {
                setEmail('admin@acme.com')
                setPassword('Admin@123')
              }}>
                👤 Admin: admin@acme.com / Admin@123
              </p>
              <p className="cursor-pointer hover:text-gray-900" onClick={() => {
                setEmail('jane.smith@acme.com')
                setPassword('Admin@123')
              }}>
                👤 Compliance: jane.smith@acme.com / Admin@123
              </p>
              <p className="cursor-pointer hover:text-gray-900" onClick={() => {
                setEmail('john.doe@acme.com')
                setPassword('Admin@123')
              }}>
                👤 Manager: john.doe@acme.com / Admin@123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          © 2024 User Access Review. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}

export default Login