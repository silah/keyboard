# Docker Deployment Guide

## Quick Start

### 1. Set up environment variables

```bash
# Copy the example file
cp .env.example .env

# Generate a secure JWT secret
openssl rand -base64 32

# Edit .env and replace JWT_SECRET with the generated value
nano .env  # or vim .env, or use any editor
```

### 2. Ensure you're using the new backend

```bash
# Make sure the new multi-tenant backend is active
cd backend
if [ -f src/index-new.ts ]; then
  mv src/index.ts src/index-old.ts
  mv src/index-new.ts src/index.ts
fi
cd ..
```

### 3. Ensure you're using the new frontend

```bash
# Make sure the new multi-tenant frontend is active
cd frontend
if [ -f src/App-new.tsx ]; then
  mv src/App.tsx src/App-old.tsx
  mv src/App-new.tsx src/App.tsx
fi
cd ..
```

### 4. Build and run with Docker

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 5. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

## Docker Commands

```bash
# Start services (after first build)
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (deletes database!)
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up --build

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend

# Execute commands in running container
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Database Persistence

The SQLite database is stored in a Docker volume (`backend_data`). This means:

✅ **Data persists** between container restarts  
✅ **Data survives** `docker-compose down`  
❌ **Data is deleted** with `docker-compose down -v`  

### Backup Database

```bash
# Copy database from container to host
docker cp keyboard-backend:/app/data/keyboard.db ./backup-keyboard.db

# Restore database to container
docker cp ./backup-keyboard.db keyboard-backend:/app/data/keyboard.db
docker-compose restart backend
```

## Environment Variables

Set in `.env` file (copy from `.env.example`):

- `JWT_SECRET` - **REQUIRED** - Secret key for JWT tokens (change in production!)
- `NODE_ENV` - Optional - Set to `production` for production deployments
- `PORT` - Optional - Backend port (default: 3001)

## Production Deployment

### 1. Security Checklist

- [ ] Set a strong `JWT_SECRET` in `.env`
- [ ] Change default passwords after first login
- [ ] Use HTTPS (reverse proxy like nginx/caddy)
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall rules
- [ ] Regular database backups

### 2. Generate Secure JWT Secret

```bash
# Generate a secure random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Use Docker Compose Override for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    restart: always

  frontend:
    restart: always
```

Deploy with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. Reverse Proxy (nginx example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
```

## Troubleshooting

### Build fails with "better-sqlite3" error

The updated Dockerfile now includes build tools (python3, make, g++) needed for better-sqlite3 compilation. If you still have issues:

```bash
# Clear Docker cache and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database locked error

```bash
# Stop all containers
docker-compose down

# Remove the volume (WARNING: deletes data!)
docker volume rm keyboard_backend_data

# Restart
docker-compose up
```

### Can't connect to backend from frontend

Check that services are on the same network:
```bash
docker network inspect keyboard_keyboard-network
```

Both containers should be listed.

### Port already in use

```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Change ports in docker-compose.yml if needed
```

### View container logs

```bash
# All logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

## Health Checks

Both services have health checks configured:

**Backend:**
- Endpoint: http://localhost:3001/health
- Interval: 30s
- Expected: `{"status":"OK","timestamp":"..."}`

**Frontend:**
- Endpoint: http://localhost/health (nginx default)
- Interval: 30s

Check health status:
```bash
docker-compose ps
```

Healthy containers show "Up (healthy)" status.

## Updating the Application

### 1. Pull new code
```bash
git pull origin main
```

### 2. Rebuild containers
```bash
docker-compose up --build
```

### 3. Check for schema changes
If database schema changed, you may need to:
- Export existing data
- Delete old database
- Reimport data

Or use migrations (future enhancement).

## Volume Management

### List volumes
```bash
docker volume ls
```

### Inspect backend volume
```bash
docker volume inspect keyboard_backend_data
```

### Backup entire volume
```bash
# Create backup
docker run --rm -v keyboard_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backend-data-backup.tar.gz -C /data .

# Restore backup
docker run --rm -v keyboard_backend_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/backend-data-backup.tar.gz"
```

## Performance Optimization

### Use Docker BuildKit
```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

### Multi-stage builds
The frontend already uses multi-stage builds (builder + nginx). The backend could be optimized similarly if needed.

### Resource limits
Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Monitoring

### Container stats
```bash
docker stats keyboard-backend keyboard-frontend
```

### Disk usage
```bash
docker system df
docker system df -v
```

## Development vs Production

**Development** (local):
- Use `npm run dev` directly (hot reload)
- SQLite file on local filesystem
- Easy debugging

**Production** (Docker):
- Isolated containers
- Managed dependencies
- Easy deployment
- Automatic restarts
- Health monitoring

## Need Help?

1. Check logs: `docker-compose logs -f`
2. Check health: `docker-compose ps`
3. Check database exists: `docker exec keyboard-backend ls -la /app/data/`
4. Test backend directly: `curl http://localhost:3001/health`
5. Check environment variables: `docker-compose config`
