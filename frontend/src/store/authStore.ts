import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  teamId: string
}

interface Team {
  id: string
  name: string
  ownerId: string
}

interface AuthStore {
  user: User | null
  team: Team | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, teamName?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User, team: Team, token: string) => void
}

const API_URL = 'http://localhost:3001'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      team: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Login failed')
          }

          const data = await response.json()
          set({
            user: data.user,
            team: data.team,
            token: data.token,
            isAuthenticated: true,
          })
        } catch (error: any) {
          console.error('Login error:', error)
          throw error
        }
      },

      register: async (email: string, password: string, name: string, teamName?: string) => {
        try {
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name, teamName }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Registration failed')
          }

          const data = await response.json()
          set({
            user: data.user,
            team: data.team,
            token: data.token,
            isAuthenticated: true,
          })
        } catch (error: any) {
          console.error('Registration error:', error)
          throw error
        }
      },

      logout: async () => {
        try {
          const { token } = get()
          if (token) {
            await fetch(`${API_URL}/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            team: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },

      checkAuth: async () => {
        try {
          const { token } = get()
          if (!token) {
            set({ isAuthenticated: false })
            return
          }

          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            throw new Error('Authentication failed')
          }

          const data = await response.json()
          set({
            user: data.user,
            team: data.team,
            isAuthenticated: true,
          })
        } catch (error) {
          console.error('Auth check error:', error)
          set({
            user: null,
            team: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },

      setUser: (user: User, team: Team, token: string) => {
        set({
          user,
          team,
          token,
          isAuthenticated: true,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        team: state.team,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
