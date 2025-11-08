export interface User {
  id: string
  email: string
  password: string // hashed
  name: string
  teamId: string
  createdAt: number
  updatedAt: number
}

export interface Team {
  id: string
  name: string
  ownerId: string // User who created the team
  createdAt: number
  updatedAt: number
}

export interface BoardAccess {
  boardId: string
  userId: string
  permission: 'owner' | 'edit' | 'view'
  sharedAt?: number
}

export interface Session {
  token: string
  userId: string
  expiresAt: number
}

// Extend existing Board type with ownership
export interface BoardWithOwnership {
  id: string
  name: string
  ownerId: string
  teamId: string
  postIts: any[]
  sections: any[]
  createdAt: number
  updatedAt: number
}
