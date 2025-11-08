#!/bin/bash

# Docker build and run script for multi-tenant Keyboard app

set -e

echo "🚀 Building and deploying Keyboard app with Docker..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect docker compose command (new: "docker compose" vs old: "docker-compose")
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    cp .env.example .env
    
    # Generate a secure JWT secret
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        # Update .env with generated secret (cross-platform sed)
        if sed --version 2>/dev/null | grep -q GNU; then
            # GNU sed (Linux)
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        else
            # BSD sed (macOS)
            sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
            rm -f .env.bak
        fi
        echo -e "${GREEN}✅ Generated secure JWT_SECRET${NC}"
    else
        echo -e "${YELLOW}⚠️  Please edit .env and set a secure JWT_SECRET${NC}"
    fi
fi

# Check if we need to activate new backend
if [ -f backend/src/index-new.ts ]; then
    echo -e "${YELLOW}📦 Activating new multi-tenant backend...${NC}"
    cd backend
    [ -f src/index.ts ] && mv src/index.ts src/index-old.ts
    mv src/index-new.ts src/index.ts
    cd ..
    echo -e "${GREEN}✅ Backend activated${NC}"
fi

# Check if we need to activate new frontend
if [ -f frontend/src/App-new.tsx ]; then
    echo -e "${YELLOW}📦 Activating new multi-tenant frontend...${NC}"
    cd frontend
    [ -f src/App.tsx ] && mv src/App.tsx src/App-old.tsx
    mv src/App-new.tsx src/App.tsx
    cd ..
    echo -e "${GREEN}✅ Frontend activated${NC}"
fi

echo ""
echo -e "${GREEN}🔨 Building Docker containers...${NC}"
$DOCKER_COMPOSE build --no-cache

echo ""
echo -e "${GREEN}🚀 Starting services...${NC}"
$DOCKER_COMPOSE up -d

echo ""
echo -e "${GREEN}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check service health
BACKEND_HEALTH=$(curl -s http://localhost:3001/health || echo "failed")
if [[ $BACKEND_HEALTH == *"OK"* ]]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    $DOCKER_COMPOSE logs backend
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Access the application:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  Health:    http://localhost:3001/health"
echo ""
echo "Useful commands:"
echo "  View logs:     $DOCKER_COMPOSE logs -f"
echo "  Stop:          $DOCKER_COMPOSE down"
echo "  Restart:       $DOCKER_COMPOSE restart"
echo "  Rebuild:       $DOCKER_COMPOSE up --build"
echo ""
