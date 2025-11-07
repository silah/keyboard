import { useState } from 'react'
import { useBoardStore } from '../store/boardStore'

interface MenuProps {
  isVisible: boolean
  onClose: () => void
}

const Menu = ({ isVisible, onClose }: MenuProps) => {
  const { currentBoard, saveBoard, newBoard } = useBoardStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleSave = async () => {
    await saveBoard()
    onClose()
  }

  const handleNew = () => {
    newBoard()
    onClose()
  }

  const handleExport = () => {
    if (!currentBoard) return
    
    setIsExporting(true)
    
    // Create simple CSV content with just text (one per line)
    const csvContent = currentBoard.postIts.map(postIt => 
      `"${postIt.text.replace(/"/g, '""')}"` // Escape quotes in text
    ).join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentBoard.name}-text-only-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setIsExporting(false)
    onClose()
  }

  const handleExportJSON = () => {
    if (!currentBoard) return
    
    const jsonContent = JSON.stringify(currentBoard, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentBoard.name}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    onClose()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleNew}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            New Board
          </button>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Save Board
          </button>

          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 mb-2">Export Options:</p>
            
            <button
              onClick={handleExportJSON}
              className="w-full px-4 py-2 mb-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Export as JSON
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export as CSV'}
            </button>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm text-gray-500">
              Board: {currentBoard?.name || 'Untitled'}
            </p>
            <p className="text-sm text-gray-500">
              Post-its: {currentBoard?.postIts.length || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Menu