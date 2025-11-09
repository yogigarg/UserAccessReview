import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return 'N/A'
  return format(new Date(date), formatStr)
}

export const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

export const formatRelativeTime = (date) => {
  if (!date) return 'N/A'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const getStatusColor = (status) => {
  const colors = {
    active: 'success',
    completed: 'success',
    approved: 'success',
    inactive: 'warning',
    paused: 'warning',
    pending: 'warning',
    terminated: 'danger',
    cancelled: 'danger',
    revoked: 'danger',
    suspended: 'danger',
    draft: 'info',
    exception: 'info',
  }
  return colors[status?.toLowerCase()] || 'info'
}

export const getRiskColor = (riskLevel) => {
  const colors = {
    critical: 'danger',
    high: 'danger',
    medium: 'warning',
    low: 'success',
  }
  return colors[riskLevel?.toLowerCase()] || 'info'
}

export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const getInitials = (firstName, lastName) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

export const capitalizeFirst = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const calculatePercentage = (value, total) => {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}