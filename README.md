# Keyboard - Digital Post-it Board

A web application for creating and managing digital post-it notes on an infinite canvas, controlled primarily through keyboard shortcuts.

## Tech Stack (Open Source First)

### Frontend
- **Vite** - Fast build tool and development server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Fabric.js** - Canvas library for interactive graphics
- **Zustand** - Lightweight state management
- **React Hotkeys Hook** - Keyboard shortcuts
- **Tailwind CSS** - Utility-first CSS

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Local JSON Storage** - Simple file-based storage for Phase 1

## Features (Phase 1)

### Core Functionality
- **Infinite Canvas**: Full browser window is a canvas
- **Post-it Notes**: Create, edit, move, and delete digital post-its
- **Tiling Sections**: Window manager-inspired section layout (1-4 sections)
  - 1 section: 100% width
  - 2 sections: 50% each side-by-side
  - 3 sections: 33% each side-by-side
  - 4 sections: 25% each in quadrants
- **Section Management**: Name sections, assign post-its to sections
- **Keyboard Shortcuts**: Tiling window manager-inspired controls
- **Pop-out Menu**: Hidden menu with save, export, and utility functions
- **Local Storage**: Save boards as JSON files
- **Export Options**: Export to CSV and JSON formats

### Keyboard Shortcuts
- `N` - Create new post-it at center
- `S` - Save current board
- `M` - Toggle menu
- `Ctrl+N` - Create new board
- `Ctrl+Space` - Create new section (max 4 sections)
- `Ctrl+1-4` - Move selected post-it to section 1-4
- `Ctrl+Alt+1-4` - Delete section and all its post-its
- `Delete/Backspace` - Delete selected post-it
- `Escape` - Deselect all

### Mouse Interactions
- **Double-click canvas** - Create new post-it
- **Double-click post-it** - Edit text
- **Double-click section title** - Edit section name
- **Click and drag** - Move post-it
- **Resize handles** - Scale post-it
- **Menu** - Mouse-driven interface

## Installation & Setup

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker and Docker Compose

#### Quick Start with Docker
```bash
# Clone the repository
git clone <repository-url>
cd keyboard

# Easy startup (recommended)
./start.sh

# Or manually with Docker Compose
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

**Access the application:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Health checks: `http://localhost:3000/health` and `http://localhost:3001/health`

#### Docker Management Commands
```bash
# Easy stop
./stop.sh

# Manual stop
docker-compose down

# Stop and remove volumes (clears saved boards)
docker-compose down -v

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up --build
```

### Option 2: Local Development

#### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

#### Backend Setup
```bash
cd backend
npm install
npm run dev
```

The backend will start at `http://localhost:3001`

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3000`

## Usage

1. **Start both services** (backend and frontend)
2. **Open** `http://localhost:3000` in your browser
3. **Create post-its** by double-clicking on the canvas or pressing `N`
4. **Edit text** by double-clicking on a post-it
5. **Create sections** by pressing `Ctrl+Space` (tiling window manager layout)
6. **Rename sections** by double-clicking on section titles
7. **Organize post-its** by selecting them and pressing `Ctrl+1-4` to move between sections
8. **Delete sections** by pressing `Ctrl+Alt+1-4` (deletes section and all its post-its)
9. **Move and resize** post-its with mouse drag and resize handles
10. **Save your board** by pressing `S` or using the menu (`M`)
11. **Export your work** via the menu (CSV or JSON formats)

## Project Structure

```
keyboard/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Canvas.tsx   # Main canvas with Fabric.js
│   │   │   └── Menu.tsx     # Pop-out menu
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── store/           # Zustand store
│   │   │   └── boardStore.ts
│   │   ├── types/           # TypeScript types
│   │   │   └── index.ts
│   │   └── App.tsx          # Main app component
│   ├── Dockerfile           # Frontend container config
│   ├── nginx.conf           # Nginx configuration
│   └── package.json
├── backend/                 # Express backend
│   ├── src/
│   │   ├── storage/         # Data storage layer
│   │   │   └── BoardStorage.ts
│   │   ├── types/           # TypeScript types
│   │   │   └── index.ts
│   │   └── index.ts         # Main server
│   ├── data/               # Local JSON storage (Docker volume)
│   ├── Dockerfile           # Backend container config
│   └── package.json
├── docker-compose.yml       # Multi-container orchestration
└── README.md
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/boards` - List all boards (metadata)
- `GET /api/boards/:id` - Get specific board
- `POST /api/boards` - Save board (create or update)
- `DELETE /api/boards/:id` - Delete board
- `GET /api/boards/:id/export` - Export board as JSON

## Development

### Docker Development
```bash
# Development with auto-reload (recommended)
docker-compose up --build

# View container logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Execute commands in running containers
docker-compose exec backend npm run build
docker-compose exec frontend npm run lint

# Access container shells
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Local Development
```bash
# Frontend Development
cd frontend
npm run dev     # Start development server
npm run build   # Build for production
npm run lint    # Run ESLint

# Backend Development
cd backend
npm run dev     # Start with hot reload
npm run build   # Build TypeScript
npm start       # Run built version
```

## Data Format

Boards are stored as JSON with this structure:

```json
{
  "id": "unique-id",
  "name": "Board Name",
  "createdAt": 1699200000000,
  "updatedAt": 1699200000000,
  "postIts": [
    {
      "id": "post-it-id",
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 150,
      "text": "Post-it content",
      "color": "#FFE066",
      "fontSize": 14,
      "sectionId": 1,
      "createdAt": 1699200000000,
      "updatedAt": 1699200000000
    }
  ],
  "sections": [
    {
      "id": 1,
      "name": "Section 1",
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080
    }
  ]
}
```

## Future Phases

### Phase 2 (Planned)
- User authentication (Auth0 or NextAuth.js)
- Cloud storage (PostgreSQL)
- Multi-tenancy (organization-based)
- Real-time collaboration

### Phase 3 (Planned)
- SSO integration (GitHub, Microsoft, Google, Okta)
- Third-party integrations (JIRA, GitHub Issues)
- Advanced export options
- Mobile support

### Phase 4 (Planned)
- Enterprise features
- Analytics and reporting
- Plugin system
- Advanced collaboration features

## Docker Configuration

### Container Details
- **Frontend**: Nginx-served React build (Alpine Linux)
- **Backend**: Node.js API server (Alpine Linux)
- **Data Persistence**: Docker volume for board storage
- **Networking**: Bridge network for inter-service communication
- **Health Checks**: Automatic service health monitoring

### Environment Variables
- `NODE_ENV=production` (backend)
- `PORT=3001` (backend)
- `REACT_APP_API_URL=http://localhost:3001` (frontend)

### Volume Mounts
- `backend_data:/app/data` - Persists board JSON files

### Port Mapping
- `3000:80` - Frontend (Nginx)
- `3001:3001` - Backend (Node.js)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.