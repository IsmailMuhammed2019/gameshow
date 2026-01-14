#!/bin/bash

# Script to fix database connection issues
# This script restarts services with proper initialization

echo "🔧 Fixing database connection issues..."

# Stop all containers
echo "🛑 Stopping containers..."
docker-compose down

# Remove any orphaned containers
echo "🧹 Cleaning up..."
docker-compose down --remove-orphans

# Wait a moment
sleep 2

# Start database first
echo "🗄️  Starting database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0
while ! docker-compose exec -T postgres pg_isready -U postgres -d millionaire_game > /dev/null 2>&1; do
  if [ $counter -ge $timeout ]; then
    echo "❌ Database failed to start within $timeout seconds"
    exit 1
  fi
  echo "   Waiting... ($counter/$timeout seconds)"
  sleep 2
  counter=$((counter + 2))
done

echo "✅ Database is ready!"

# Start backend
echo "🚀 Starting backend..."
docker-compose up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
timeout=60
counter=0
while ! curl -s http://localhost:3001/health/ready > /dev/null 2>&1; do
  if [ $counter -ge $timeout ]; then
    echo "❌ Backend failed to start within $timeout seconds"
    echo "📋 Checking logs..."
    docker-compose logs --tail=50 backend
    exit 1
  fi
  echo "   Waiting... ($counter/$timeout seconds)"
  sleep 2
  counter=$((counter + 2))
done

echo "✅ Backend is ready!"

# Start frontend
echo "🎨 Starting frontend..."
docker-compose up -d frontend

# Wait a moment for frontend
sleep 5

# Check status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🔍 Health Checks:"
echo "Backend Health:"
curl -s http://localhost:3001/health | jq '.' || echo "Backend not responding"

echo ""
echo "Backend Readiness:"
curl -s http://localhost:3001/health/ready | jq '.' || echo "Backend not ready"

echo ""
echo "✅ All services started!"
echo ""
echo "📋 To view logs:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f postgres"
echo ""
echo "🔍 To check database connection:"
echo "   curl http://localhost:3001/health/ready"

