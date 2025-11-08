import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

interface BoardListItem {
  id: string
  name: string
  ownerId: string
  permission: string
  isOwner: boolean
  postItCount: number
  createdAt: number
  updatedAt: number
}

const Dashboard = () => {
  const [boards, setBoards] = useState<BoardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewBoardModal, setShowNewBoardModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  
  const { user, team, token, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadBoards()
  }, [])

  const loadBoards = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/boards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load boards')
      }

      const data = await response.json()
      setBoards(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load boards')
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async () => {
    if (!newBoardName.trim()) {
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/boards/new', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newBoardName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create board')
      }

      const newBoard = await response.json()
      setBoards([...boards, {
        id: newBoard.id,
        name: newBoard.name,
        ownerId: newBoard.ownerId,
        permission: 'owner',
        isOwner: true,
        postItCount: 0,
        createdAt: newBoard.createdAt,
        updatedAt: newBoard.updatedAt,
      }])
      setNewBoardName('')
      setShowNewBoardModal(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create board')
    }
  }

  const deleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete board')
      }

      setBoards(boards.filter(b => b.id !== boardId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete board')
    }
  }

  const openBoard = (boardId: string) => {
    navigate(`/board/${boardId}`)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Keyboard</h1>
            <p className="text-sm text-gray-600">
              {user?.name} · {team?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/team')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Team Settings
            </button>
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Boards</h2>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 flex items-center gap-2"
          >
            <span>+</span> New Board
          </button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No boards yet</p>
            <button
              onClick={() => setShowNewBoardModal(true)}
              className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600"
            >
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div onClick={() => openBoard(board.id)} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {board.name}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{board.postItCount} post-its</p>
                    <p>Updated {formatDate(board.updatedAt)}</p>
                    {!board.isOwner && (
                      <p className="text-teal-600 font-medium">
                        Shared · {board.permission}
                      </p>
                    )}
                  </div>
                </div>
                {board.isOwner && (
                  <div className="border-t border-gray-200 px-6 py-3 flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/board/${board.id}/share`)
                      }}
                      className="text-sm text-gray-600 hover:text-teal-600"
                    >
                      Share
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBoard(board.id)
                      }}
                      className="text-sm text-gray-600 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Board Modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Board</h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createBoard()
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewBoardModal(false)
                  setNewBoardName('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                disabled={!newBoardName.trim()}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
