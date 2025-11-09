import { motion } from 'framer-motion'

const Loader = ({ fullScreen = false, size = 'md' }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const loaderContent = (
    <div className="flex items-center justify-center">
      <motion.div
        className={`${sizes[size]} border-4 border-gray-200 border-t-blue-600 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        {loaderContent}
      </div>
    )
  }

  return loaderContent
}

export default Loader