import express, { Request, Response } from 'express'
import cors from 'cors'
import { AuthService } from './services/AuthService'
import { BoardService } from './services/BoardService'
import { TeamService } from './services/TeamService'
import { authenticate } from './middleware/auth'
import { BoardWithOwnership } from './types/database'

const app = express()
const port = process.env.PORT || 3001

const authService = new AuthService()
const boardService = new BoardService()
const teamService = new TeamService()

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// ============================================
// Authentication Routes
// ============================================

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, teamName } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    const result = await authService.register(email, password, name, teamName)
    
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        teamId: result.user.teamId
      },
      team: result.team,
      token: result.token
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return res.status(400).json({ error: error.message || 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const result = await authService.login(email, password)
    
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        teamId: result.user.teamId
      },
      token: result.token
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return res.status(401).json({ error: error.message || 'Login failed' })
  }
})

app.post('/api/auth/logout', authenticate, (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7) || ''
    authService.logout(token)
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ error: 'Logout failed' })
  }
})

app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  try {
    const user = authService.getUserById(req.user!.id)
    const team = authService.getUserTeam(req.user!.id)
    
    res.json({ user, team })
  } catch (error) {
    console.error('Get user error:', error)
    return res.status(500).json({ error: 'Failed to get user info' })
  }
})

// ============================================
// Board Routes (Protected)
// ============================================

app.get('/api/boards', authenticate, (req: Request, res: Response) => {
  try {
    const boards = boardService.listUserBoards(req.user!.id)
    res.json(boards)
  } catch (error) {
    console.error('Error fetching boards:', error)
    return res.status(500).json({ error: 'Failed to fetch boards' })
  }
})

app.get('/api/boards/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const board = boardService.getBoard(id, req.user!.id)
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found or access denied' })
    }
    
    res.json(board)
  } catch (error) {
    console.error('Error fetching board:', error)
    return res.status(500).json({ error: 'Failed to fetch board' })
  }
})

app.post('/api/boards/new', authenticate, (req: Request, res: Response) => {
  try {
    const { name } = req.body
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Board name is required' })
    }
    
    const newBoard = boardService.createBoard(name, req.user!.id, req.user!.teamId)
    res.json(newBoard)
  } catch (error) {
    console.error('Error creating new board:', error)
    return res.status(500).json({ error: 'Failed to create new board' })
  }
})

app.post('/api/boards', authenticate, (req: Request, res: Response) => {
  try {
    const boardData = req.body as BoardWithOwnership
    
    if (!boardData.id || !boardData.name) {
      return res.status(400).json({ error: 'Board ID and name are required' })
    }
    
    // Ensure user owns or has edit access to the board
    const savedBoard = boardService.updateBoard(boardData, req.user!.id)
    
    if (!savedBoard) {
      return res.status(403).json({ error: 'No permission to edit this board' })
    }
    
    res.json(savedBoard)
  } catch (error: any) {
    console.error('Error saving board:', error)
    return res.status(500).json({ error: error.message || 'Failed to save board' })
  }
})

app.delete('/api/boards/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const deleted = boardService.deleteBoard(id, req.user!.id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Board not found' })
    }
    
    res.json({ message: 'Board deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting board:', error)
    return res.status(403).json({ error: error.message || 'Failed to delete board' })
  }
})

app.get('/api/boards/:id/export', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const board = boardService.getBoard(id, req.user!.id)
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found or access denied' })
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${board.name}.json"`)
    res.json(board)
  } catch (error) {
    console.error('Error exporting board:', error)
    return res.status(500).json({ error: 'Failed to export board' })
  }
})

// ============================================
// Board Sharing Routes
// ============================================

app.post('/api/boards/:id/share', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId, permission } = req.body
    
    if (!userId || !permission || !['edit', 'view'].includes(permission)) {
      return res.status(400).json({ error: 'Valid userId and permission (edit/view) required' })
    }
    
    boardService.shareBoard(id, req.user!.id, userId, permission)
    res.json({ message: 'Board shared successfully' })
  } catch (error: any) {
    console.error('Error sharing board:', error)
    return res.status(403).json({ error: error.message || 'Failed to share board' })
  }
})

app.delete('/api/boards/:id/share/:userId', authenticate, (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params
    
    boardService.unshareBoard(id, req.user!.id, userId)
    res.json({ message: 'Board access revoked successfully' })
  } catch (error: any) {
    console.error('Error unsharing board:', error)
    return res.status(403).json({ error: error.message || 'Failed to revoke access' })
  }
})

app.get('/api/boards/:id/access', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const accessList = boardService.getBoardAccess(id, req.user!.id)
    res.json(accessList)
  } catch (error: any) {
    console.error('Error getting board access:', error)
    return res.status(403).json({ error: error.message || 'Failed to get access list' })
  }
})

// ============================================
// Team Routes
// ============================================

app.get('/api/team', authenticate, (req: Request, res: Response) => {
  try {
    const team = teamService.getTeam(req.user!.teamId)
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }
    
    res.json(team)
  } catch (error) {
    console.error('Error fetching team:', error)
    return res.status(500).json({ error: 'Failed to fetch team' })
  }
})

app.get('/api/team/members', authenticate, (req: Request, res: Response) => {
  try {
    const members = teamService.getTeamMembers(req.user!.teamId)
    res.json(members)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return res.status(500).json({ error: 'Failed to fetch team members' })
  }
})

app.put('/api/team/name', authenticate, (req: Request, res: Response) => {
  try {
    const { name } = req.body
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Team name is required' })
    }
    
    const team = teamService.updateTeamName(req.user!.teamId, req.user!.id, name)
    res.json(team)
  } catch (error: any) {
    console.error('Error updating team name:', error)
    return res.status(403).json({ error: error.message || 'Failed to update team name' })
  }
})

app.post('/api/team/invite', authenticate, (req: Request, res: Response) => {
  try {
    const { email, name, tempPassword } = req.body
    
    if (!email || !name || !tempPassword) {
      return res.status(400).json({ error: 'Email, name, and temporary password are required' })
    }
    
    const newUser = teamService.inviteUserToTeam(req.user!.teamId, req.user!.id, email, name, tempPassword)
    res.json(newUser)
  } catch (error: any) {
    console.error('Error inviting user:', error)
    return res.status(400).json({ error: error.message || 'Failed to invite user' })
  }
})

app.delete('/api/team/members/:userId', authenticate, (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    teamService.removeUserFromTeam(req.user!.teamId, req.user!.id, userId)
    res.json({ message: 'User removed from team successfully' })
  } catch (error: any) {
    console.error('Error removing user:', error)
    return res.status(403).json({ error: error.message || 'Failed to remove user' })
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
  console.log(`🔐 Multi-tenant authentication enabled`)
})
