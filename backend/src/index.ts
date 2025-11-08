import express, { Request, Response } from 'express'
import cors from 'cors'
import { BoardStorage } from './storage/BoardStorage'
import { Board } from './types'

const app = express()
const port = process.env.PORT || 3001
const boardStorage = new BoardStorage()

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Get all boards (metadata only)
app.get('/api/boards', (req: Request, res: Response) => {
  try {
    const boards = boardStorage.listBoards()
    res.json(boards)
  } catch (error) {
    console.error('Error fetching boards:', error)
    return res.status(500).json({ error: 'Failed to fetch boards' })
  }
})

// Get specific board
app.get('/api/boards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const board = boardStorage.getBoard(id)
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }
    
    res.json(board)
  } catch (error) {
    console.error('Error fetching board:', error)
    return res.status(500).json({ error: 'Failed to fetch board' })
  }
})

// Create new board
app.post('/api/boards/new', (req: Request, res: Response) => {
  try {
    const { name } = req.body
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Board name is required' })
    }
    
    const newBoard: Board = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      postIts: [],
      sections: [
        {
          id: 1,
          name: 'Section 1',
          x: 0,
          y: 0,
          width: 1920, // Default width, will be adjusted by frontend
          height: 1080 // Default height, will be adjusted by frontend
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    const savedBoard = boardStorage.saveBoard(newBoard)
    res.json(savedBoard)
  } catch (error) {
    console.error('Error creating new board:', error)
    return res.status(500).json({ error: 'Failed to create new board' })
  }
})

// Save board (create or update)
app.post('/api/boards', (req: Request, res: Response) => {
  try {
    const boardData = req.body as Board
    
    // Basic validation
    if (!boardData.id || !boardData.name) {
      return res.status(400).json({ error: 'Board ID and name are required' })
    }
    
    if (!Array.isArray(boardData.postIts)) {
      return res.status(400).json({ error: 'Post-its must be an array' })
    }
    
    if (!Array.isArray(boardData.sections)) {
      return res.status(400).json({ error: 'Sections must be an array' })
    }
    
    const savedBoard = boardStorage.saveBoard(boardData)
    res.json(savedBoard)
  } catch (error) {
    console.error('Error saving board:', error)
    return res.status(500).json({ error: 'Failed to save board' })
  }
})

// Delete board
app.delete('/api/boards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = boardStorage.deleteBoard(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Board not found' })
    }
    
    res.json({ message: 'Board deleted successfully' })
  } catch (error) {
    console.error('Error deleting board:', error)
    return res.status(500).json({ error: 'Failed to delete board' })
  }
})

// Export board as JSON
app.get('/api/boards/:id/export', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const board = boardStorage.getBoard(id)
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${board.name}.json"`)
    res.json(board)
  } catch (error) {
    console.error('Error exporting board:', error)
    return res.status(500).json({ error: 'Failed to export board' })
  }
})

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', error)
  return res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req: Request, res: Response) => {
  return res.status(404).json({ error: 'Not found' })
})

app.listen(port, () => {
  console.log(`🚀 Keyboard Backend API running at http://localhost:${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`📝 API endpoints: http://localhost:${port}/api/boards`)
})