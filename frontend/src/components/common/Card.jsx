import { motion } from 'framer-motion'

const Card = ({ 
  children, 
  title, 
  subtitle,
  actions,
  hover = true,
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card border border-gray-200 ${hover ? 'hover:shadow-glass-lg hover:scale-[1.01]' : ''} ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}

export default Card