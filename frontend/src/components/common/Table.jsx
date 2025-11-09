import { motion } from 'framer-motion'
import Loader from './Loader'

const Table = ({ 
  columns, 
  data, 
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}) => {
  if (loading) {
    return (
      <div className="glass-card flex items-center justify-center py-12">
        <Loader />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-white/70">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-glass">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={column.cellClassName}>
                    {column.cell ? column.cell(row) : row[column.accessor]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table