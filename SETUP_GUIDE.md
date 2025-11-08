# Quick Setup Guide - Multi-Tenant Keyboard App

## What's Been Implemented

I've implemented a complete multi-tenant architecture for your Keyboard app with:

✅ **User Authentication** - JWT-based login/register  
✅ **Teams** - Users belong to teams, complete isolation between teams  
✅ **Board Ownership** - Boards owned by users within teams  
✅ **Board Sharing** - Share boards with team members (view/edit permissions)  
✅ **Dashboard** - View all owned and shared boards  
✅ **Team Management** - Invite/remove team members  

## Installation & Setup

### Backend Setup

1. **Install new dependencies:**
```bash
cd backend
npm install
```

This installs: `better-sqlite3`, `bcrypt`, `jsonwebtoken`

2. **Switch to new backend:**
```bash
mv src/index.ts src/index-old.ts
mv src/index-new.ts src/index.ts
```

3. **Start the backend:**
```bash
npm run dev
```

The SQLite database will be automatically created at `backend/data/keyboard.db`

### Frontend Setup

1. **Install new dependencies:**
```bash
cd frontend
npm install
```

This installs: `react-router-dom`

2. **Switch to new frontend:**
```bash
mv src/App.tsx src/App-old.tsx
mv src/App-new.tsx src/App.tsx
```

3. **Start the frontend:**
```bash
npm run dev
```

## First Use

1. Open http://localhost:3000
2. You'll see a **Register** screen
3. Create an account:
   - Name: Your name
   - Email: your@email.com
   - Team Name: Your Team (optional, defaults to "Your Name's Team")
   - Password: anything (min 6 chars)

4. You'll be logged in and see the **Dashboard**

## Using the App

### Dashboard
- View all your boards (owned + shared)
- Create new boards with the "+ New Board" button
- Click any board to open the editor
- Delete your own boards
- Share your boards with team members

### Board Editor
- Same Canvas interface as before
- All keyboard shortcuts still work
- Auto-saves to the database
- Click "← Dashboard" to go back

### Team Settings
- View team members
- Invite new members (if you're the team owner)
- Remove members (owner only)

### Board Sharing (Future Feature)
The infrastructure is ready, but you'll need to create a UI for:
- Viewing who has access to a board
- Adding/removing team members from a board
- Setting permissions (view/edit)

## API Endpoints

All board endpoints now require authentication:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get boards (with token)
curl http://localhost:3001/api/boards \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Structure

### New Backend Files
```
backend/src/
├── database/
│   ├── db.ts              # SQLite connection
│   └── schema.sql         # Database schema
├── middleware/
│   └── auth.ts            # JWT authentication middleware
├── services/
│   ├── AuthService.ts     # User auth & sessions
│   ├── BoardService.ts    # Board CRUD with permissions
│   └── TeamService.ts     # Team management
├── types/
│   └── database.ts        # Database type definitions
└── index.ts               # Updated server (was index-new.ts)
```

### New Frontend Files
```
frontend/src/
├── components/
│   ├── Login.tsx          # Login form
│   └── Register.tsx       # Registration form
├── pages/
│   ├── Dashboard.tsx      # Board list page
│   ├── TeamSettings.tsx   # Team management page
│   └── BoardEditor.tsx    # Board editor wrapper
├── store/
│   └── authStore.ts       # Authentication state
└── App.tsx                # Updated with routing (was App-new.tsx)
```

### Updated Files
- `backend/package.json` - Added new dependencies
- `frontend/package.json` - Added react-router-dom
- `frontend/src/store/boardStore.ts` - Updated to use auth tokens

## Key Features

### 1. Multi-Tenancy
- Each user belongs to exactly one team
- Teams are completely isolated - users can only see their team's data
- Boards belong to a team and can only be shared within that team

### 2. Authentication
- JWT tokens with 7-day expiration
- Tokens stored in localStorage (persists across page refreshes)
- Automatic token validation on app load

### 3. Permissions
- **Owner** - Can edit, delete, and share the board
- **Edit** - Can view and edit the board
- **View** - Can only view the board (not implemented in UI yet)

### 4. Data Storage
- SQLite database (single file: `backend/data/keyboard.db`)
- Automatic schema creation on first run
- Foreign keys ensure data integrity
- Indexes for performance

## Environment Variables

Create `backend/.env`:
```env
PORT=3001
JWT_SECRET=change-this-to-a-secure-random-string
NODE_ENV=development
```

## Testing

### Test User Flow
1. Register as "Alice" (alice@test.com)
2. Create a board called "Alice's Board"
3. Go to Team Settings
4. Invite "Bob" (bob@test.com) with a temporary password
5. Logout
6. Login as Bob (bob@test.com with the temp password)
7. Bob should see an empty dashboard (no boards yet)
8. Alice can share her board with Bob (API is ready, UI needs to be built)

## Next Steps

To complete the board sharing UI, create a page at `/board/:boardId/share` that:
1. Fetches board access list: `GET /api/boards/:id/access`
2. Shows team members not yet shared
3. Allows adding users: `POST /api/boards/:id/share`
4. Allows removing users: `DELETE /api/boards/:id/share/:userId`

## Troubleshooting

**"Cannot find module" errors**
- Run `npm install` in both backend and frontend

**Database locked**
- Close any database browser tools
- Delete `backend/data/keyboard.db` and restart (will lose data)

**Token invalid**
- Token expired after 7 days
- Logout and login again

**Board not loading**
- Check browser console for errors
- Ensure backend is running
- Check that you have access to the board

## Full Documentation

See `MULTI_TENANT_IMPLEMENTATION.md` for comprehensive documentation including:
- Complete API reference
- Database schema details
- Security considerations
- Migration guide for existing data
- Troubleshooting guide

## Summary

You now have a fully functional multi-tenant application! Users can:
- Register and login
- Create teams (automatically on registration)
- Create and manage boards within their team
- Invite team members
- Share boards with team members (API ready, UI can be built)

The infrastructure supports everything you requested. The main remaining task is building UI components for the board sharing workflow.
