# Installation Checklist

Follow these steps in order to get the multi-tenant version running.

## ☐ Backend Setup

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

**Expected output:** Should install bcrypt, better-sqlite3, jsonwebtoken, and their types.

### Step 2: Activate New Server
```bash
# Backup old version
mv src/index.ts src/index-old.ts

# Activate new version
mv src/index-new.ts src/index.ts
```

### Step 3: Start Backend
```bash
npm run dev
```

**Expected output:**
```
✅ Database initialized at: /path/to/backend/data/keyboard.db
🚀 Keyboard Backend API running at http://localhost:3001
📊 Health check: http://localhost:3001/health
🔐 Multi-tenant authentication enabled
```

### Step 4: Test Backend
```bash
# In another terminal
curl http://localhost:3001/health
```

**Expected output:** `{"status":"OK","timestamp":"..."}`

---

## ☐ Frontend Setup

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

**Expected output:** Should install react-router-dom and types.

### Step 2: Activate New App
```bash
# Backup old version
mv src/App.tsx src/App-old.tsx

# Activate new version
mv src/App-new.tsx src/App.tsx
```

### Step 3: Start Frontend
```bash
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### Step 4: Test Frontend
Open http://localhost:3000 in your browser.

**Expected:** You should see a Login/Register page.

---

## ☐ First User Registration

### Step 1: Register
1. Click "Sign up" on the login page
2. Fill in:
   - **Name**: Your Name
   - **Email**: test@example.com
   - **Team Name**: My Team (or leave blank)
   - **Password**: password123
   - **Confirm Password**: password123
3. Click "Create account"

**Expected:** Automatically logged in and redirected to empty Dashboard.

### Step 2: Create First Board
1. Click "+ New Board"
2. Enter name: "My First Board"
3. Click "Create"

**Expected:** Board appears in the list.

### Step 3: Open Board
1. Click on "My First Board"

**Expected:** Canvas editor opens (same as before, with all features working).

### Step 4: Test Board Features
1. Press `N` to create a post-it
2. Double-click post-it to edit
3. Press `Ctrl+Space` to create a section
4. Press `S` to save

**Expected:** Everything works as before, auto-saves to database.

### Step 5: Return to Dashboard
1. Click "← Dashboard" button

**Expected:** Return to board list, board shows "1 post-it".

---

## ☐ Team Features

### Step 1: Access Team Settings
1. From Dashboard, click "Team Settings"

**Expected:** See team name and yourself as the only member.

### Step 2: Invite Team Member
1. Click "+ Invite Member"
2. Fill in:
   - **Name**: Bob Smith
   - **Email**: bob@example.com
   - **Temporary Password**: temppass123
3. Click "Send Invite"

**Expected:** Bob appears in team members list.

### Step 3: Test Second User
1. Click "Logout" (top right)
2. Login as bob@example.com / temppass123

**Expected:** Bob sees empty dashboard (no boards yet - Alice hasn't shared).

---

## ☐ Verification Tests

### Test 1: Data Persistence
1. Refresh the page (F5)
2. **Expected:** Still logged in, boards still visible

### Test 2: Multiple Browsers
1. Open in Chrome (Alice logged in)
2. Open in Firefox (Bob logged in)
3. **Expected:** Each sees their own dashboard

### Test 3: Database File
1. Check that `backend/data/keyboard.db` exists
2. **Expected:** File size > 0 KB

### Test 4: API Authentication
```bash
# Without token (should fail)
curl http://localhost:3001/api/boards

# Expected: {"error":"Authentication required"}

# With token (should work)
# Get token from login response or browser localStorage
curl http://localhost:3001/api/boards \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: Array of boards
```

---

## ☐ Optional: Board Sharing API Test

### Test Sharing Endpoint (via curl)

```bash
# 1. Login as Alice
ALICE_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. Get Alice's boards
BOARD_ID=$(curl -s http://localhost:3001/api/boards \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  | jq -r '.[0].id')

# 3. Get Bob's user ID
BOB_ID=$(curl -s http://localhost:3001/api/team/members \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  | jq -r '.[] | select(.email=="bob@example.com") | .id')

# 4. Share board with Bob
curl -X POST http://localhost:3001/api/boards/$BOARD_ID/share \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$BOB_ID\",\"permission\":\"edit\"}"

# 5. Login as Bob and check boards
BOB_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"temppass123"}' \
  | jq -r '.token')

curl http://localhost:3001/api/boards \
  -H "Authorization: Bearer $BOB_TOKEN"

# Expected: Bob now sees the shared board
```

---

## ☐ Troubleshooting

### Problem: Backend won't start
**Check:**
- Node.js version >= 18
- All dependencies installed (`npm install`)
- Port 3001 not already in use
- No syntax errors in index.ts

**Fix:**
```bash
# Check Node version
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for running processes
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### Problem: Frontend won't start
**Check:**
- Backend is running first
- All dependencies installed
- Port 3000 not already in use

**Fix:**
```bash
# Reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Problem: Can't register/login
**Check:**
- Backend is running and accessible
- Browser console for errors
- Network tab shows requests to localhost:3001

**Fix:**
```bash
# Test backend directly
curl http://localhost:3001/health

# Check backend logs for errors
# (in backend terminal)
```

### Problem: Database errors
**Fix:**
```bash
# Delete and recreate database
cd backend
rm -rf data/keyboard.db
# Restart backend - will recreate schema
npm run dev
```

### Problem: TypeScript errors
**Note:** The compile errors you see are expected until you run `npm install`. They will disappear after:
```bash
# Backend
cd backend && npm install

# Frontend  
cd frontend && npm install
```

---

## ☐ Success Criteria

You've successfully installed the multi-tenant version when:

- ✅ Backend runs without errors on port 3001
- ✅ Frontend runs without errors on port 3000
- ✅ Can register a new user
- ✅ Can create and edit boards
- ✅ Can logout and login again
- ✅ Dashboard shows all boards
- ✅ Can invite team members
- ✅ Database file exists and grows with data
- ✅ Page refresh maintains login state
- ✅ All existing Canvas features still work

---

## Need Help?

1. **Check the logs** - Both backend and frontend terminals show errors
2. **Check browser console** - Press F12 and look for errors
3. **Read the docs**:
   - `SETUP_GUIDE.md` - Detailed setup
   - `MULTI_TENANT_IMPLEMENTATION.md` - Complete reference
   - `IMPLEMENTATION_SUMMARY.md` - Overview

4. **Common fixes**:
   - Delete `node_modules` and reinstall
   - Delete database and restart backend
   - Clear browser cache/localStorage
   - Check that ports 3000 and 3001 are available
