import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import UserList from './components/users/UserList'
import UserDetail from './components/users/UserDetail'
import UserForm from './components/users/UserForm'
import ApplicationList from './components/applications/ApplicationList'
import ApplicationDetail from './components/applications/ApplicationDetail'
import ApplicationForm from './components/applications/ApplicationForm'
import CampaignList from './components/campaigns/CampaignList'
import CampaignDetail from './components/campaigns/CampaignDetail'
import CampaignForm from './components/campaigns/CampaignForm'
import ReviewList from './components/reviews/ReviewList'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Loader from './components/common/Loader'
import SODRules from './components/sod/SODRules'
import SODViolations from './components/sod/SODViolations'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <Loader fullScreen />
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* User Routes */}
          <Route path="users" element={<UserList />} />
          <Route path="users/new" element={<UserForm />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="users/:id/edit" element={<UserForm />} />
          
          {/* Application Routes */}
          <Route path="applications" element={<ApplicationList />} />
          <Route path="applications/new" element={<ApplicationForm />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="applications/:id/edit" element={<ApplicationForm />} />
          
          {/* Campaign Routes */}
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="campaigns/new" element={<CampaignForm />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="campaigns/:id/edit" element={<CampaignForm />} />
          
          {/* Review Routes */}
          <Route path="reviews" element={<ReviewList />} />
          
          {/* SOD Routes */}
          <Route path="sod/rules" element={<SODRules />} />
          <Route path="sod/violations" element={<SODViolations />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
