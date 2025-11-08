import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/db'
import { User, Team, Session } from '../types/database'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SALT_ROUNDS = 10
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export class AuthService {
  /**
   * Register a new user and create their personal team
   */
  async register(email: string, password: string, name: string, teamName?: string): Promise<{ user: User; team: Team; token: string }> {
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // Create team first
    const teamId = uuidv4()
    const userId = uuidv4()
    const now = Date.now()

    const team: Team = {
      id: teamId,
      name: teamName || `${name}'s Team`,
      ownerId: userId,
      createdAt: now,
      updatedAt: now
    }

    db.prepare(`
      INSERT INTO teams (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(team.id, team.name, team.ownerId, team.createdAt, team.updatedAt)

    // Create user
    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      teamId,
      createdAt: now,
      updatedAt: now
    }

    db.prepare(`
      INSERT INTO users (id, email, password, name, team_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.email, user.password, user.name, user.teamId, user.createdAt, user.updatedAt)

    // Create session
    const token = this.createSession(user.id)

    return { user, team, token }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any

    if (!row) {
      throw new Error('Invalid credentials')
    }

    // Map database columns to User interface
    const user: User = {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      teamId: row.team_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    const token = this.createSession(user.id)

    return { user, token }
  }

  /**
   * Create a new session for a user
   */
  createSession(userId: string): string {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
    const expiresAt = Date.now() + SESSION_DURATION

    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, userId, expiresAt)

    return token
  }

  /**
   * Verify a session token and return the user
   */
  verifySession(token: string): User | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      
      // Check if session exists and is not expired
      const session = db.prepare(`
        SELECT * FROM sessions WHERE token = ? AND expires_at > ?
      `).get(token, Date.now()) as Session | undefined

      if (!session) {
        return null
      }

      // Get user
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any

      if (!row) {
        return null
      }

      // Map database columns to User interface
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        teamId: row.team_id, // Map snake_case to camelCase
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Logout user by deleting their session
   */
  logout(token: string): void {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  }

  /**
   * Get user by ID (without password)
   */
  getUserById(userId: string): Omit<User, 'password'> | null {
    const user = db.prepare(`
      SELECT id, email, name, team_id, created_at, updated_at 
      FROM users WHERE id = ?
    `).get(userId) as Omit<User, 'password'> | undefined

    return user || null
  }

  /**
   * Get user's team
   */
  getUserTeam(userId: string): Team | null {
    const team = db.prepare(`
      SELECT t.* FROM teams t
      INNER JOIN users u ON u.team_id = t.id
      WHERE u.id = ?
    `).get(userId) as Team | undefined

    return team || null
  }
}
