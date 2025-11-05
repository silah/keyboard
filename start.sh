#!/bin/bash

# Keyboard App - Docker Startup Script

echo "🚀 Starting Keyboard Digital Post-it Board..."
echo "========================================"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Docker daemon is not running. Please start Docker first."
    exit 1
fi

echo "Docker and Docker Compose are ready"
echo ""

# Build and start the containers
echo "Building and starting containers..."
docker-compose up --build -d

# Wait a moment for containers to start
echo "Waiting for services to start..."
sleep 5

# Check service status
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "Keyboard app is starting up!"
echo ""
echo "Access your application at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Quick commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop app:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
echo "Checking health status in 30 seconds..."

# Wait for health checks
sleep 30

# Check health
echo ""
echo "Health Check Results:"
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "   Frontend: Healthy"
else
    echo " Frontend: Not responding"
fi

if curl -f http://localhost:3001/health &> /dev/null; then
    echo " Backend: Healthy"
else
    echo " Backend: Not responding"
fi

echo ""
echo "Ready to use! Open http://localhost:3000 in your browser."