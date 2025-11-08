import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/AuthService'

const authService = new AuthService()

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
        teamId: string
      }
    }
  }
}

/**
 * Middleware to authenticate requests using JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const user = authService.verifySession(token)

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Attach user to request (without password)
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    teamId: user.teamId
  }

  next()
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const user = authService.verifySession(token)

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        teamId: user.teamId
      }
    }
  }

  next()
}
