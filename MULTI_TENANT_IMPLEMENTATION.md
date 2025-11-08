# Multi-Tenant Implementation Guide

This document explains the multi-tenant architecture implementation for the Keyboard application.

## Overview

The application now supports:
1. **User Authentication** - JWT-based auth with login/register
2. **Teams** - Users belong to teams, isolation between teams
3. **Board Ownership** - Boards belong to users within teams
4. **Board Sharing** - Share boards with team members (view/edit permissions)
5. **Dashboard** - View all owned and shared boards

## Architecture Changes

### Backend Changes

#### 1. Database (SQLite)
- Replaced JSON file storage with SQLite database
- Schema includes: `users`, `teams`, `boards`, `board_access`, `sessions`
- Full multi-tenancy support with foreign keys

#### 2. New Services
- `AuthService` - User registration, login, session management
- `BoardService` - Board CRUD with access control
- `TeamService` - Team and member management

#### 3. API Changes
All board endpoints now require authentication via `Bearer` token in headers.

**New Authentication Endpoints:**
```
POST /api/auth/register - Register new user
POST /api/auth/login - Login user
POST /api/auth/logout - Logout user
GET  /api/auth/me - Get current user info
```

**Updated Board Endpoints** (now require auth):
```
GET    /api/boards - List user's boards
GET    /api/boards/:id - Get board (with access check)
POST   /api/boards/new - Create new board
POST   /api/boards - Update board
DELETE /api/boards/:id - Delete board
```

**New Sharing Endpoints:**
```
POST   /api/boards/:id/share - Share board with user
DELETE /api/boards/:id/share/:userId - Revoke access
GET    /api/boards/:id/access - List users with access
```

**Team Endpoints:**
```
GET    /api/team - Get current team
GET    /api/team/members - List team members
POST   /api/team/invite - Invite new member
DELETE /api/team/members/:userId - Remove member
```

### Frontend Changes

#### 1. New Components
- `Login.tsx` - Login form
- `Register.tsx` - Registration form
- `Dashboard.tsx` - Board list/management page
- `TeamSettings.tsx` - Team management page
- `BoardEditor.tsx` - Wrapper for Canvas with routing

#### 2. New Stores
- `authStore.ts` - Authentication state management with persistence

#### 3. Updated Stores
- `boardStore.ts` - Updated to pass authentication tokens to API

#### 4. Routing
- Uses `react-router-dom` for navigation
- Protected routes require authentication
- Routes: `/`, `/dashboard`, `/team`, `/board/:boardId`

## Installation Steps

### Backend

1. **Install dependencies:**
```bash
cd backend
npm install
```

New dependencies added:
- `better-sqlite3` - SQLite database
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens

2. **Replace old index.ts:**
```bash
mv src/index.ts src/index-old.ts
mv src/index-new.ts src/index.ts
```

3. **Run the backend:**
```bash
npm run dev
```

The database will be automatically created at `backend/data/keyboard.db`.

### Frontend

1. **Install dependencies:**
```bash
cd frontend
npm install
```

New dependency added:
- `react-router-dom` - Routing

2. **Replace old App.tsx:**
```bash
mv src/App.tsx src/App-old.tsx
mv src/App-new.tsx src/App.tsx
```

3. **Run the frontend:**
```bash
npm run dev
```

## Usage Flow

### 1. Registration
- User registers with email, password, name, and optional team name
- System creates user account and personal team
- User is automatically logged in

### 2. Dashboard
- View all boards (owned + shared)
- Create new boards
- Delete owned boards
- Click board to open editor
- Access team settings

### 3. Board Editor
- Same Canvas interface as before
- All changes auto-save with authentication
- Back button to return to dashboard

### 4. Team Management
- View team members
- Invite new members (owner only)
- Remove members (owner only)

### 5. Board Sharing
- Share boards with team members
- Set permissions (view/edit)
- View who has access
- Revoke access

## Data Migration

To migrate existing boards from JSON storage:

```javascript
// Run this script in backend directory
const fs = require('fs')
const db = require('./dist/database/db').default
const { AuthService } = require('./dist/services/AuthService')
const { BoardService } = require('./dist/services/BoardService')

// Read old boards.json
const oldBoards = JSON.parse(fs.readFileSync('./data/boards.json', 'utf8'))

// Create a migration user
const authService = new AuthService()
const boardService = new BoardService()

async function migrate() {
  // Register migration user
  const { user, team, token } = await authService.register(
    'admin@example.com',
    'admin123',
    'Admin User',
    'Migration Team'
  )

  // Migrate each board
  for (const [id, board] of Object.entries(oldBoards)) {
    const migratedBoard = {
      ...board,
      ownerId: user.id,
      teamId: team.id
    }
    
    boardService.createBoard(
      board.name,
      user.id,
      team.id
    )
  }
  
  console.log('Migration complete!')
  console.log(`Login with: admin@example.com / admin123`)
}

migrate()
```

## Security Considerations

1. **JWT Secret**: Change `JWT_SECRET` environment variable in production
2. **Password Strength**: Enforce minimum 6 characters (update as needed)
3. **Session Duration**: Default 7 days, configurable in AuthService
4. **HTTPS**: Use HTTPS in production for auth endpoints
5. **CORS**: Configure CORS properly for production domains

## Environment Variables

Create `.env` file in backend:

```env
PORT=3001
JWT_SECRET=your-super-secret-key-change-this-in-production
NODE_ENV=development
```

## Database Schema

See `backend/src/database/schema.sql` for full schema.

Key tables:
- **users** - User accounts
- **teams** - Team information
- **boards** - Board data (JSON columns for postIts/sections)
- **board_access** - Access control (user → board permissions)
- **sessions** - Active user sessions

## API Authentication

All protected endpoints require:
```
Authorization: Bearer <token>
```

Get token from:
- Login response: `{ user, token }`
- Register response: `{ user, team, token }`

## Testing

### 1. Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "teamName": "Test Team"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 3. Create Board (with token)
```bash
curl -X POST http://localhost:3001/api/boards/new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name": "My Board"}'
```

### 4. Share Board
```bash
curl -X POST http://localhost:3001/api/boards/<board-id>/share \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "userId": "<target-user-id>",
    "permission": "edit"
  }'
```

## Troubleshooting

### Database locked error
- Close any DB browser tools
- Delete `keyboard.db` and restart (will lose data)

### Token invalid
- Token expired (7 days)
- Logout and login again
- Check token format in headers

### Board not found
- User doesn't have access
- Board was deleted
- Wrong board ID

### Cannot invite user
- Email already exists
- Not team owner
- Invalid email format

## Future Enhancements

1. **Email Invitations** - Send actual invitation emails
2. **Password Reset** - Forgot password flow
3. **Real-time Collaboration** - WebSocket for live updates
4. **Board Templates** - Predefined board layouts
5. **Activity Log** - Track board changes
6. **Export Improvements** - PDF, PNG exports
7. **Mobile App** - React Native version
8. **OAuth** - Google/GitHub sign-in

## File Structure

```
backend/
├── src/
│   ├── database/
│   │   ├── db.ts              # Database connection
│   │   └── schema.sql         # Schema definition
│   ├── middleware/
│   │   └── auth.ts            # Auth middleware
│   ├── services/
│   │   ├── AuthService.ts     # Authentication
│   │   ├── BoardService.ts    # Board management
│   │   └── TeamService.ts     # Team management
│   ├── types/
│   │   └── database.ts        # Database types
│   └── index.ts               # Main server

frontend/
├── src/
│   ├── components/
│   │   ├── Login.tsx          # Login form
│   │   ├── Register.tsx       # Register form
│   │   ├── Canvas.tsx         # Board canvas (existing)
│   │   └── Menu.tsx           # Menu (existing)
│   ├── pages/
│   │   ├── Dashboard.tsx      # Boards list
│   │   ├── TeamSettings.tsx   # Team management
│   │   └── BoardEditor.tsx    # Board editor wrapper
│   ├── store/
│   │   ├── authStore.ts       # Auth state
│   │   └── boardStore.ts      # Board state (updated)
│   └── App.tsx                # Main app with routing
```

## Support

For issues or questions:
1. Check this README
2. Review API responses for error messages
3. Check browser console for frontend errors
4. Check backend logs for server errors
