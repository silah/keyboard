#!/bin/bash

# Keyboard App - Docker Stop Script

echo "🛑 Stopping Keyboard Digital Post-it Board..."
echo "========================================"

# Stop the containers
echo "⏹️  Stopping containers..."
docker-compose down

echo ""
echo "📊 Final Status:"
docker-compose ps

echo ""
echo "✅ Keyboard app has been stopped."
echo ""
echo "💡 To start again, run: ./start.sh or docker-compose up"
echo "🗑️  To remove all data: docker-compose down -v"