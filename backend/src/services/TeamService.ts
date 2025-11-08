import { v4 as uuidv4 } from 'uuid'
import db from '../database/db'
import { Team, User } from '../types/database'

export class TeamService {
  /**
   * Get team by ID
   */
  getTeam(teamId: string): Team | null {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as Team | undefined
    return team || null
  }

  /**
   * Get all members of a team
   */
  getTeamMembers(teamId: string): Array<Omit<User, 'password'>> {
    const members = db.prepare(`
      SELECT id, email, name, team_id, created_at, updated_at
      FROM users
      WHERE team_id = ?
      ORDER BY created_at ASC
    `).all(teamId) as Array<Omit<User, 'password'>>

    return members
  }

  /**
   * Update team name (only owner can do this)
   */
  updateTeamName(teamId: string, userId: string, newName: string): Team | null {
    const team = this.getTeam(teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (team.ownerId !== userId) {
      throw new Error('Only team owner can update team name')
    }

    const now = Date.now()
    db.prepare(`
      UPDATE teams SET name = ?, updated_at = ? WHERE id = ?
    `).run(newName, now, teamId)

    return {
      ...team,
      name: newName,
      updatedAt: now
    }
  }

  /**
   * Invite user to team by adding them
   * In a real app, this would send an email invitation
   * For now, we'll just create a user account in the team
   */
  inviteUserToTeam(teamId: string, inviterId: string, email: string, name: string, tempPassword: string): Omit<User, 'password'> {
    // Verify inviter is in the team
    const inviter = db.prepare('SELECT * FROM users WHERE id = ?').get(inviterId) as User | undefined
    if (!inviter || inviter.teamId !== teamId) {
      throw new Error('You are not a member of this team')
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const userId = uuidv4()
    const now = Date.now()

    // This is simplified - in production you'd send an invitation email
    // and let the user set their own password
    const bcrypt = require('bcrypt')
    const hashedPassword = bcrypt.hashSync(tempPassword, 10)

    db.prepare(`
      INSERT INTO users (id, email, password, name, team_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, hashedPassword, name, teamId, now, now)

    return {
      id: userId,
      email,
      name,
      teamId,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Remove user from team (only team owner can do this)
   */
  removeUserFromTeam(teamId: string, ownerId: string, userId: string): void {
    const team = this.getTeam(teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (team.ownerId !== ownerId) {
      throw new Error('Only team owner can remove members')
    }

    if (team.ownerId === userId) {
      throw new Error('Cannot remove team owner')
    }

    db.prepare('DELETE FROM users WHERE id = ? AND team_id = ?').run(userId, teamId)
  }

  /**
   * Transfer team ownership to another member
   */
  transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Team | null {
    const team = this.getTeam(teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (team.ownerId !== currentOwnerId) {
      throw new Error('Only current owner can transfer ownership')
    }

    // Verify new owner is in the team
    const newOwner = db.prepare('SELECT * FROM users WHERE id = ? AND team_id = ?').get(newOwnerId, teamId)
    if (!newOwner) {
      throw new Error('New owner must be a team member')
    }

    const now = Date.now()
    db.prepare(`
      UPDATE teams SET owner_id = ?, updated_at = ? WHERE id = ?
    `).run(newOwnerId, now, teamId)

    return {
      ...team,
      ownerId: newOwnerId,
      updatedAt: now
    }
  }
}
