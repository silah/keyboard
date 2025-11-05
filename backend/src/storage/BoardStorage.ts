import fs from 'fs'
import path from 'path'
import { Board } from '../types'

const DATA_DIR = path.join(__dirname, '../../data')
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize boards file if it doesn't exist
if (!fs.existsSync(BOARDS_FILE)) {
  fs.writeFileSync(BOARDS_FILE, JSON.stringify({}))
}

export class BoardStorage {
  private getBoards(): Record<string, Board> {
    try {
      const data = fs.readFileSync(BOARDS_FILE, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading boards:', error)
      return {}
    }
  }

  private saveBoards(boards: Record<string, Board>): void {
    try {
      fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2))
    } catch (error) {
      console.error('Error saving boards:', error)
      throw new Error('Failed to save boards')
    }
  }

  public saveBoard(board: Board): Board {
    const boards = this.getBoards()
    board.updatedAt = Date.now()
    boards[board.id] = board
    this.saveBoards(boards)
    return board
  }

  public getBoard(id: string): Board | null {
    const boards = this.getBoards()
    return boards[id] || null
  }

  public getAllBoards(): Board[] {
    const boards = this.getBoards()
    return Object.values(boards)
  }

  public deleteBoard(id: string): boolean {
    const boards = this.getBoards()
    if (boards[id]) {
      delete boards[id]
      this.saveBoards(boards)
      return true
    }
    return false
  }

  public listBoards(): Array<{ id: string; name: string; createdAt: number; updatedAt: number; postItCount: number }> {
    const boards = this.getBoards()
    return Object.values(boards).map(board => ({
      id: board.id,
      name: board.name,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      postItCount: board.postIts.length
    }))
  }
}