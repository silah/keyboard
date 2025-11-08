import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import Canvas from '../components/Canvas'
import Menu from '../components/Menu'
import { useState } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

const BoardEditor = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { currentBoard, loadBoard, saveBoard, newBoard, createSection } = useBoardStore()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      if (!boardId) {
        setError('No board ID provided')
        setLoading(false)
        return
      }

      try {
        // Load the board with authentication
        await loadBoard(boardId, token || '')
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load board')
        setLoading(false)
      }
    }

    init()
  }, [boardId, token])

  useKeyboardShortcuts({
    onNewNote: () => {
      // Handled by Canvas component
    },
    onSaveBoard: () => {
      saveBoard(token || '')
    },
    onNewBoard: () => {
      navigate('/dashboard')
    },
    onToggleMenu: () => {
      setShowMenu(!showMenu)
    },
    onNewSection: () => {
      createSection()
    }
  })

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading board...</div>
      </div>
    )
  }

  if (error || !currentBoard) {
    return (
      <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Board not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-gray-100 relative overflow-hidden">
      <Canvas />
      <Menu isVisible={showMenu} onClose={() => setShowMenu(false)} />
      
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm hover:bg-black/70 z-10"
      >
        ← Dashboard
      </button>

      {/* Board name */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded z-10">
        {currentBoard.name}
      </div>
      
      {/* Help indicator */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        M: menu • N: new note • S: save • Ctrl+Space: new section
      </div>
    </div>
  )
}

export default BoardEditor
