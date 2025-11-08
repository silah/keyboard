import { v4 as uuidv4 } from 'uuid'
import db from '../database/db'
import { Board } from '../types'
import { BoardWithOwnership, BoardAccess } from '../types/database'

export class BoardService {
  /**
   * Create a new board for a user
   */
  createBoard(name: string, userId: string, teamId: string): BoardWithOwnership {
    const boardId = uuidv4()
    const now = Date.now()

    const board: BoardWithOwnership = {
      id: boardId,
      name,
      ownerId: userId,
      teamId,
      postIts: [],
      sections: [
        {
          id: 1,
          name: 'Section 1',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080
        }
      ],
      createdAt: now,
      updatedAt: now
    }

    // Insert board
    db.prepare(`
      INSERT INTO boards (id, name, owner_id, team_id, post_its, sections, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      board.id,
      board.name,
      board.ownerId,
      board.teamId,
      JSON.stringify(board.postIts),
      JSON.stringify(board.sections),
      board.createdAt,
      board.updatedAt
    )

    // Grant owner access
    db.prepare(`
      INSERT INTO board_access (board_id, user_id, permission)
      VALUES (?, ?, 'owner')
    `).run(board.id, userId)

    return board
  }

  /**
   * Get board by ID (if user has access)
   */
  getBoard(boardId: string, userId: string): BoardWithOwnership | null {
    // Check access
    const access = this.checkAccess(boardId, userId)
    if (!access) {
      return null
    }

    const row = db.prepare(`
      SELECT * FROM boards WHERE id = ?
    `).get(boardId) as any

    if (!row) {
      return null
    }

    return {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      teamId: row.team_id,
      postIts: JSON.parse(row.post_its),
      sections: JSON.parse(row.sections),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  /**
   * Update board (if user has edit access)
   */
  updateBoard(board: BoardWithOwnership, userId: string): BoardWithOwnership | null {
    const access = this.checkAccess(board.id, userId)
    if (!access || access.permission === 'view') {
      throw new Error('No permission to edit this board')
    }

    const now = Date.now()
    board.updatedAt = now

    db.prepare(`
      UPDATE boards 
      SET name = ?, post_its = ?, sections = ?, updated_at = ?
      WHERE id = ?
    `).run(
      board.name,
      JSON.stringify(board.postIts),
      JSON.stringify(board.sections),
      board.updatedAt,
      board.id
    )

    return board
  }

  /**
   * Delete board (if user is owner)
   */
  deleteBoard(boardId: string, userId: string): boolean {
    const access = this.checkAccess(boardId, userId)
    if (!access || access.permission !== 'owner') {
      throw new Error('Only board owner can delete the board')
    }

    const result = db.prepare('DELETE FROM boards WHERE id = ?').run(boardId)
    return result.changes > 0
  }

  /**
   * List all boards accessible to a user
   */
  listUserBoards(userId: string): Array<{
    id: string
    name: string
    ownerId: string
    permission: string
    isOwner: boolean
    postItCount: number
    createdAt: number
    updatedAt: number
  }> {
    const rows = db.prepare(`
      SELECT 
        b.id,
        b.name,
        b.owner_id,
        b.created_at,
        b.updated_at,
        b.post_its,
        ba.permission
      FROM boards b
      INNER JOIN board_access ba ON ba.board_id = b.id
      WHERE ba.user_id = ?
      ORDER BY b.updated_at DESC
    `).all(userId) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      permission: row.permission,
      isOwner: row.owner_id === userId,
      postItCount: JSON.parse(row.post_its).length,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * Share board with another user in the same team
   */
  shareBoard(boardId: string, ownerId: string, targetUserId: string, permission: 'edit' | 'view'): void {
    // Verify owner has permission
    const ownerAccess = this.checkAccess(boardId, ownerId)
    if (!ownerAccess || ownerAccess.permission !== 'owner') {
      throw new Error('Only board owner can share the board')
    }

    // Verify both users are in the same team
    const ownerTeam = db.prepare('SELECT team_id FROM users WHERE id = ?').get(ownerId) as { team_id: string } | undefined
    const targetTeam = db.prepare('SELECT team_id FROM users WHERE id = ?').get(targetUserId) as { team_id: string } | undefined

    if (!ownerTeam || !targetTeam || ownerTeam.team_id !== targetTeam.team_id) {
      throw new Error('Can only share boards with users in the same team')
    }

    // Check if access already exists
    const existingAccess = db.prepare(`
      SELECT * FROM board_access WHERE board_id = ? AND user_id = ?
    `).get(boardId, targetUserId)

    if (existingAccess) {
      // Update permission
      db.prepare(`
        UPDATE board_access SET permission = ? WHERE board_id = ? AND user_id = ?
      `).run(permission, boardId, targetUserId)
    } else {
      // Create new access
      db.prepare(`
        INSERT INTO board_access (board_id, user_id, permission, shared_at)
        VALUES (?, ?, ?, ?)
      `).run(boardId, targetUserId, permission, Date.now())
    }
  }

  /**
   * Remove board access from a user
   */
  unshareBoard(boardId: string, ownerId: string, targetUserId: string): void {
    const access = this.checkAccess(boardId, ownerId)
    if (!access || access.permission !== 'owner') {
      throw new Error('Only board owner can unshare the board')
    }

    db.prepare(`
      DELETE FROM board_access 
      WHERE board_id = ? AND user_id = ? AND permission != 'owner'
    `).run(boardId, targetUserId)
  }

  /**
   * Get users with access to a board
   */
  getBoardAccess(boardId: string, requesterId: string): Array<{
    userId: string
    userName: string
    userEmail: string
    permission: string
  }> {
    // Verify requester has access
    const access = this.checkAccess(boardId, requesterId)
    if (!access) {
      throw new Error('No access to this board')
    }

    const rows = db.prepare(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        ba.permission
      FROM board_access ba
      INNER JOIN users u ON u.id = ba.user_id
      WHERE ba.board_id = ?
    `).all(boardId) as any[]

    return rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      permission: row.permission
    }))
  }

  /**
   * Check if user has access to a board
   */
  private checkAccess(boardId: string, userId: string): BoardAccess | null {
    const access = db.prepare(`
      SELECT * FROM board_access WHERE board_id = ? AND user_id = ?
    `).get(boardId, userId) as any

    if (!access) {
      return null
    }

    return {
      boardId: access.board_id,
      userId: access.user_id,
      permission: access.permission,
      sharedAt: access.shared_at
    }
  }
}
